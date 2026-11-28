export interface SwarmProbeFigure {
  key: number;
  transform: string;
}

const SWARM_PROBE_PLACEMENTS = [
  [-44, -14, 8],
  [-22, -20, -12],
  [2, -16, 4],
  [26, -20, 16],
  [46, -10, -6],
  [-34, 6, -18],
  [-10, 2, 10],
  [14, 6, -4],
  [38, 12, 20],
  [-44, 20, 2],
  [-18, 22, -8],
  [6, 24, 14],
] as const;

export const SWARM_PROBE_FIGURES: readonly SwarmProbeFigure[] = SWARM_PROBE_PLACEMENTS.map(
  ([x, y, angle], key) => ({ key, transform: `translate(${x} ${y}) rotate(${angle})` }),
);
