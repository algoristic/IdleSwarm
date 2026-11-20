import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { maxCatchUpMs } from '@app/balance/domain/formulas';
import type { FoundEvent } from '@app/finds/domain/models/finds-event.model';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { Units } from '@app/swarm/domain/models/units.model';

import type { CatchUpResult, CatchUpSource, CatchUpSummary } from './models/catch-up.model';
import type { GameEvent } from './models/game-event.model';
import type { GameState } from './models/game-state.model';
import { step } from './step-logic';
import { nextSplitMs } from './step-split-logic';

export type { CatchUpResult, CatchUpSource, CatchUpSummary } from './models/catch-up.model';

/** Grober Schritt beim Nachholen, wie der Standardschritt des Headless-Runners. */
export const CATCH_UP_STEP_MS = MS_PER_SECOND;

/** Ab dieser Abwesenheit zeigt die Oberfläche die Rückkehr-Zusammenfassung (US-07.03). */
export const RETURN_SUMMARY_MIN_MS = 5 * MS_PER_MINUTE;

/**
 * Holt `elapsedMs` Spielzeit nach (Offline-Fortschritt beim Laden, US-07.01; Rückstand eines
 * verborgenen Tabs, TK §4): Schritte von `CATCH_UP_STEP_MS`, geteilt an `nextSplitMs` wie der
 * Headless-Runner, damit Ankunft, Abbau-Schwellen, Buff-Abläufe und Auto-Weiterziehen auf die
 * Millisekunde fallen. Höchstens `T_max` (`maxCatchUpMs`); der Rest verfällt. Negative oder nicht
 * endliche Angaben (Uhr zurückgestellt) holen nichts nach.
 *
 * `time.now` rückt wie bei `step` um die nachgeholte Zeit vor; den Abgleich mit der echten Uhr
 * (`syncClock`) übernimmt der Aufrufer.
 */
export function catchUp(
  state: GameState,
  elapsedMs: number,
  source: CatchUpSource,
  params: BalanceParams = DEFAULT_BALANCE,
): CatchUpResult {
  const requestedMs = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const totalMs = Math.min(requestedMs, maxCatchUpMs(params));
  const events: GameEvent[] = [];
  let current = state;
  for (let doneMs = 0; doneMs < totalMs;) {
    const dtMs = Math.min(CATCH_UP_STEP_MS, nextSplitMs(current, 0, params), totalMs - doneMs);
    const result = step(current, dtMs, params);
    if (result.events.length > 0) {
      events.push(...result.events);
    }
    current = result.state;
    doneMs += dtMs;
  }
  return {
    state: current,
    events,
    summary: summarize(state, current, events, source, requestedMs, totalMs, params),
  };
}

/** Ob die Oberfläche die Zusammenfassung zeigen soll: ab `RETURN_SUMMARY_MIN_MS` Abwesenheit. */
export function isReturnSummaryDue(summary: CatchUpSummary): boolean {
  return summary.requestedMs >= RETURN_SUMMARY_MIN_MS;
}

/**
 * Fasst zwei aufeinanderfolgende Nachholvorgänge zusammen, etwa Laden und danach einen verborgenen
 * Tab, bevor der Spieler die erste Zusammenfassung quittiert hat. Der Anlass bleibt der erste.
 */
export function mergeCatchUpSummaries(
  first: CatchUpSummary,
  second: CatchUpSummary,
): CatchUpSummary {
  return {
    source: first.source,
    requestedMs: first.requestedMs + second.requestedMs,
    caughtUpMs: first.caughtUpMs + second.caughtUpMs,
    discardedMs: first.discardedMs + second.discardedMs,
    capped: first.capped || second.capped,
    food: {
      gained: first.food.gained.add(second.food.gained),
      spentOnBrood: first.food.spentOnBrood.add(second.food.spentOnBrood),
      net: first.food.net.add(second.food.net),
    },
    dna: first.dna.add(second.dna),
    hatched: addUnits(first.hatched, second.hatched),
    lost: addUnits(first.lost, second.lost),
    arrivals: [...first.arrivals, ...second.arrivals],
    departures: first.departures + second.departures,
    finds: [...first.finds, ...second.finds],
  };
}

/**
 * Leitet die Zusammenfassung aus Vorher, Nachher und den Ereignissen ab. Offline gibt es keine
 * Kommandos: Einheiten ändern sich nur durch Brut, Kampf und Zurücklassen beim Aufbruch, DNA nur
 * durch Kampf und Funde, Nahrung wird nur von der Brut verbraucht.
 */
function summarize(
  before: GameState,
  after: GameState,
  events: readonly GameEvent[],
  source: CatchUpSource,
  requestedMs: number,
  caughtUpMs: number,
  params: BalanceParams,
): CatchUpSummary {
  let lostDrones = Num.ZERO;
  let lostSoldiers = Num.ZERO;
  let departures = 0;
  const arrivals: SiteTypeId[] = [];
  const finds: FoundEvent[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'departed':
        departures++;
        lostDrones = lostDrones.add(event.leftBehind.drones);
        lostSoldiers = lostSoldiers.add(event.leftBehind.soldiers);
        break;
      case 'arrived':
        arrivals.push(event.siteType);
        lostSoldiers = lostSoldiers.add(event.losses);
        break;
      case 'found':
        finds.push(event);
        break;
      default:
        break;
    }
  }
  const lost: Units = { queens: Num.ZERO, drones: lostDrones, soldiers: lostSoldiers };
  const hatched: Units = {
    queens: after.units.queens.sub(before.units.queens),
    drones: after.units.drones.sub(before.units.drones).add(lostDrones),
    soldiers: after.units.soldiers.sub(before.units.soldiers).add(lostSoldiers),
  };
  // `h · c̄` mit `c̄ = a · c_d + (1 − a) · c_s` ist genau `c_d · ΔD + c_s · ΔS` (Game-Design §4.3).
  const spentOnBrood = hatched.drones
    .mul(params.droneCost)
    .add(hatched.soldiers.mul(params.soldierCost));
  const net = after.res.food.sub(before.res.food);
  const discardedMs = requestedMs - caughtUpMs;
  return {
    source,
    requestedMs,
    caughtUpMs,
    discardedMs,
    capped: discardedMs > 0,
    food: { gained: net.add(spentOnBrood), spentOnBrood, net },
    dna: after.res.dna.sub(before.res.dna),
    hatched,
    lost,
    arrivals,
    departures,
    finds,
  };
}

function addUnits(a: Units, b: Units): Units {
  return {
    queens: a.queens.add(b.queens),
    drones: a.drones.add(b.drones),
    soldiers: a.soldiers.add(b.soldiers),
  };
}
