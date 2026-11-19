import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { reachedHarvestThresholds } from '@app/balance/domain/formulas';
import {
  drawFind,
  nextBuffExpiryMs,
  nextHarvestThreshold,
  pruneBuffs,
} from '@app/finds/domain/finds-logic';
import { applyAutoMove } from '@app/site/domain/auto-move-logic';
import { collectStep, collectToStock } from '@app/site/domain/collect-logic';
import { arrive } from '@app/site/domain/move-logic';
import { applyBrood } from '@app/swarm/domain/brood-logic';

import type { GameEvent, StepResult } from './models/game-event.model';
import type { GameState, GameTime } from './models/game-state.model';
import { stateModifiers } from './modifiers-logic';

export type { GameEvent, StepResult } from './models/game-event.model';

const NO_EVENTS: readonly GameEvent[] = Object.freeze([]);

/**
 * Setzt die Spielzeit auf `playedMs`, das Ende eines Teils. Am Ende des Schritts gelten exakt
 * `now + dtMs` und `played + dtMs` des Anfangs, damit sich Teilungen nicht in der Zeit aufsummieren.
 */
function advanceTo(
  state: GameState,
  playedMs: number,
  start: GameTime,
  endPlayedMs: number,
  dtMs: number,
): GameState {
  const { time } = state;
  if (playedMs === time.played) {
    return state;
  }
  const now = playedMs === endPlayedMs ? start.now + dtMs : time.now + (playedMs - time.played);
  return { ...state, time: { ...time, now, played: playedMs } };
}

/**
 * Schreibt die Simulation um `dtMs` Millisekunden fort, ohne die Eingabe zu verändern.
 *
 * Reihenfolge nach Game-Design §4.3: (0) Reise, (1) Grundertrag und Sammeln, (2) Brut,
 * (3) Auto-Weiterziehen. Der Schritt wird geteilt an der Ankunft, an jeder Abbau-Schwelle und an
 * jedem Ablauf eines Buffs (§4.16). Im Reiseteil ruht das Sammeln und die Brut läuft; danach läuft
 * der Rest wie ein Schritt ohne Reise. So liegen Ankunft, Funde und Buff-Abläufe unabhängig von
 * `dtMs` exakt.
 *
 * Funde (§4.16): eine Ziehung nach jeder Ankunft (nach Kampf, DNA, neuer Futterstelle und neuen
 * Kandidaten), je eine an jeder durch Sammeln erreichten Abbau-Schwelle in aufsteigender Reihenfolge,
 * an der letzten nach `siteDepleted`. Abgelaufene Buffs werden entfernt.
 *
 * Die Modifikatoren (Game-Design §4.13) gelten je Teil des Schritts: im Reiseteil ohne bedingte
 * Effekte, nach der Ankunft mit dem Typ der neuen Futterstelle, mit den Buffs des Teils.
 *
 * @throws RangeError bei negativem oder nicht endlichem `dtMs`.
 */
export function step(
  state: GameState,
  dtMs: number,
  params: BalanceParams = DEFAULT_BALANCE,
): StepResult {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    throw new RangeError(`step: ungültiges dtMs ${dtMs}`);
  }
  if (dtMs === 0) {
    return { state, events: NO_EVENTS };
  }
  const events: GameEvent[] = [];
  const start = state.time;
  const endPlayedMs = start.played + dtMs;
  let current = pruneBuffs(state);
  while (current.time.played < endPlayedMs) {
    const modifiers = stateModifiers(current, params);
    const playedMs = current.time.played;
    const expiryMs = nextBuffExpiryMs(current.finds, playedMs) ?? Infinity;
    const { travel } = current;
    if (travel !== null) {
      // (0) Reise: Grundertrag und Sammeln ruhen, die Brut läuft (Game-Design §4.11).
      const arrivalMs = playedMs + Math.max(0, travel.remainingMs);
      const endMs = Math.min(endPlayedMs, arrivalMs, expiryMs);
      const pieceMs = endMs - playedMs;
      if (pieceMs > 0) {
        current = advanceTo(
          applyBrood(current, pieceMs, params, modifiers),
          endMs,
          start,
          endPlayedMs,
          dtMs,
        );
      }
      if (arrivalMs > endMs) {
        current = { ...current, travel: { ...travel, remainingMs: travel.remainingMs - pieceMs } };
      } else {
        const arrived = arrive(current, params, modifiers);
        events.push(...arrived.events);
        const found = drawFind(
          arrived.state,
          'arrival',
          null,
          params,
          stateModifiers(arrived.state, params),
        );
        events.push(...found.events);
        current = found.state;
      }
    } else {
      // (1) und (2); frisch gesammelte Nahrung steht der Brut sofort zur Verfügung.
      const next = nextHarvestThreshold(current, params, modifiers);
      const thresholdMs = next === null ? Infinity : playedMs + next.msLeft;
      const endMs = Math.min(endPlayedMs, thresholdMs, expiryMs);
      const pieceMs = endMs - playedMs;
      const { site } = current;
      const reachedBefore = reachedHarvestThresholds(site.size, site.stock, params);
      const collected =
        next !== null && endMs === thresholdMs
          ? collectToStock(current, next.stock, endMs)
          : collectStep(current, pieceMs, playedMs, params, modifiers);
      events.push(...collected.events);
      current = advanceTo(
        applyBrood(collected.state, pieceMs, params, modifiers),
        endMs,
        start,
        endPlayedMs,
        dtMs,
      );
      current = pruneBuffs(current);
      const reachedAfter = reachedHarvestThresholds(current.site.size, current.site.stock, params);
      for (let threshold = reachedBefore + 1; threshold <= reachedAfter; threshold++) {
        const found = drawFind(
          current,
          'harvest',
          threshold,
          params,
          stateModifiers(current, params),
        );
        events.push(...found.events);
        current = found.state;
      }
    }
    current = pruneBuffs(current);
  }
  const auto = applyAutoMove(current, params, stateModifiers(current, params));
  events.push(...auto.events);
  return { state: auto.state, events: events.length > 0 ? events : NO_EVENTS };
}

/**
 * Setzt `time.now` auf die echte Zeit, ohne dass Spielzeit vergeht (`played` bleibt).
 *
 * @throws RangeError bei negativem oder nicht endlichem `nowMs`.
 */
export function syncClock(state: GameState, nowMs: number): GameState {
  if (!Number.isFinite(nowMs) || nowMs < 0) {
    throw new RangeError(`syncClock: ungültiges nowMs ${nowMs}`);
  }
  if (nowMs === state.time.now) {
    return state;
  }
  return { ...state, time: { ...state.time, now: nowMs } };
}
