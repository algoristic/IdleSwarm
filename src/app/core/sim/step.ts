import { BalanceParams, DEFAULT_BALANCE } from '../balance/constants';
import type { GameState } from '../state/game-state';
import { applyBrood } from './brood';

/** Ereignisse eines Schritts; noch leer, neue Varianten werden hier ergänzt. */
export type GameEvent = never;

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

const NO_EVENTS: readonly GameEvent[] = Object.freeze([]);

/**
 * Schreibt die Simulation um `dtMs` Millisekunden fort, ohne die Eingabe zu verändern.
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
  // Reihenfolge nach Game-Design §4.3: Sammeln (folgt mit AP 1.1.5) läuft vor der Brut.
  const next = applyBrood(state, dtMs, params);
  const { time } = next;
  return {
    state: {
      ...next,
      time: { ...time, now: time.now + dtMs, played: time.played + dtMs },
    },
    events: NO_EVENTS,
  };
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
