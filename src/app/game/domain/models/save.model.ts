import { GameState } from './game-state.model';

export const LOAD_OUTCOMES = ['loaded', 'fresh', 'reset'] as const;
export type LoadOutcome = (typeof LOAD_OUTCOMES)[number];

export interface LoadResult {
  state: GameState;
  outcome: LoadOutcome;
}
