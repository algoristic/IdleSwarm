import { SCENE_COLORS } from '../art/art-palette';
import { lcg } from '../art/shape.utils';
import { DriftSpeck, DriftStreak } from './models/scene.model';

export const STREAK_TILE = 120;

export function driftItems(travel: false): DriftSpeck[];
export function driftItems(travel: true): DriftStreak[];
export function driftItems(travel: boolean): DriftSpeck[] | DriftStreak[];
export function driftItems(travel: boolean): DriftSpeck[] | DriftStreak[] {
  const random = lcg(42);
  const colors = SCENE_COLORS.drift;
  if (!travel) {
    const specks: DriftSpeck[] = [];
    for (let i = 0; i < 70; i++) {
      const x = +((random() - 0.5) * 900).toFixed(0);
      const y = +((random() - 0.5) * 1000).toFixed(0);
      const r = +(0.8 + random() * 1.8).toFixed(1);
      specks.push({ x, y, r, c: colors[i % 3] });
    }
    return specks;
  }
  const streaks: DriftStreak[] = [];
  for (let i = 0; i < 16; i++) {
    const x = +((random() - 0.5) * 2000).toFixed(0);
    const y = +(random() * STREAK_TILE).toFixed(0);
    const len = +(10 + random() * 26).toFixed(0);
    const c = colors[i % 3];
    const w = +(1 + random() * 1.6).toFixed(1);
    const o = +(0.4 + random() * 0.5).toFixed(2);
    streaks.push({ x, y, len, c, w, o });
  }
  return streaks;
}
