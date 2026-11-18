import { nextRandom } from '@app/shared/util/rng/rng';

import type { GameState } from './models/game-state.model';

/** Ergebnis einer Ziehung aus dem Spielzustand. */
export interface StateRandomResult {
  /** Zufallswert in `[0, 1)`. */
  readonly value: number;
  /** Neuer Spielzustand mit fortgeschriebenem `rngState`. */
  readonly state: GameState;
}

/** Zieht einen Wert aus dem Spielzustand und liefert den fortgeschriebenen Zustand. */
export function drawRandom(state: GameState): StateRandomResult {
  const { value, rngState } = nextRandom(state.rngState);
  return { value, state: { ...state, rngState } };
}
