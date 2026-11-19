import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { applyAutoMove } from '@app/site/domain/auto-move-logic';
import { collectStep } from '@app/site/domain/collect-logic';
import { arrive } from '@app/site/domain/move-logic';
import { applyBrood } from '@app/swarm/domain/brood-logic';

import type { GameEvent, StepResult } from './models/game-event.model';
import type { GameState } from './models/game-state.model';

export type { GameEvent, StepResult } from './models/game-event.model';

const NO_EVENTS: readonly GameEvent[] = Object.freeze([]);

function advanceTime(state: GameState, dtMs: number): GameState {
  const { time } = state;
  return { ...state, time: { ...time, now: time.now + dtMs, played: time.played + dtMs } };
}

/**
 * Schreibt die Simulation um `dtMs` Millisekunden fort, ohne die Eingabe zu verändern.
 *
 * Reihenfolge nach Game-Design §4.3: (0) Reise, (1) Grundertrag und Sammeln, (2) Brut,
 * (3) Auto-Weiterziehen. Endet eine Reise im Schritt, wird er an der Ankunft geteilt: Bis dahin ruht
 * das Sammeln und die Brut läuft, danach läuft der Rest wie ein Schritt ohne Reise. So liegt die
 * Ankunft unabhängig von `dtMs` exakt.
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
  let current = state;
  let restMs = dtMs;
  const { travel } = current;
  if (travel !== null) {
    // (0) Reise: Grundertrag und Sammeln ruhen, die Brut läuft (Game-Design §4.11).
    const travelMs = Math.min(restMs, travel.remainingMs);
    if (travelMs > 0) {
      current = advanceTime(applyBrood(current, travelMs, params), travelMs);
    }
    restMs -= travelMs;
    const remainingMs = travel.remainingMs - travelMs;
    if (remainingMs > 0) {
      current = { ...current, travel: { ...travel, remainingMs } };
    } else {
      const arrived = arrive(current, params);
      current = arrived.state;
      events.push(...arrived.events);
    }
  }
  if (restMs > 0 && current.travel === null) {
    // (1) und (2); frisch gesammelte Nahrung steht der Brut sofort zur Verfügung.
    const collected = collectStep(current, restMs, current.time.played, params);
    events.push(...collected.events);
    current = advanceTime(applyBrood(collected.state, restMs, params), restMs);
  }
  const auto = applyAutoMove(current, params);
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
