import { GameState } from './models/game-state.model';

export function nextRandom(state: Pick<GameState, 'rngState'>): number {
  let t = (state.rngState = (state.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function pickWeighted<K extends string>(
  state: Pick<GameState, 'rngState'>,
  weights: Readonly<Partial<Record<K, number>>>,
  order: readonly K[],
): K {
  const entries: [K, number][] = [];
  for (const key of order) {
    const weight = weights[key];
    if (weight !== undefined) entries.push([key, weight]);
  }
  const last = entries.at(-1);
  if (last === undefined) throw new Error('pickWeighted: no weights');
  let r = nextRandom(state) * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of entries) {
    r -= weight;
    if (r < 0) return key;
  }
  return last[0];
}
