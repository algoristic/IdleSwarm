import { driftItems, STREAK_TILE } from './drift.utils';
import { DriftCircle, SpeckGroup, StreakLine, StreakSegment } from './models/swarm.model';

const STREAK_TILE_REACH = 9;

export function speckGroups(): SpeckGroup[] {
  const groups = new Map<string, { color: string; circles: DriftCircle[] }>();
  for (const d of driftItems(false)) {
    let group = groups.get(d.c);
    if (!group) {
      group = { color: d.c, circles: [] };
      groups.set(d.c, group);
    }
    group.circles.push({ x: d.x, y: d.y, r: d.r });
  }
  return [...groups.values()];
}

export function streakLines(): StreakLine[] {
  return driftItems(true).map((d) => {
    const segments: StreakSegment[] = [];
    for (let k = -STREAK_TILE_REACH; k <= STREAK_TILE_REACH; k++) {
      segments.push({ y0: d.y + k * STREAK_TILE, y1: d.y + k * STREAK_TILE + d.len });
    }
    return { color: d.c, width: d.w, opacity: d.o, x: d.x, segments };
  });
}
