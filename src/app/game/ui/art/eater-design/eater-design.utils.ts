import { lcg } from '../shape.utils';

type PathPoint = readonly [number, number];

const AMOEBA_START: PathPoint = [10, -0.5];
const AMOEBA_CURVES: readonly (readonly [PathPoint, PathPoint, PathPoint])[] = [
  [
    [10, 1.2],
    [8, 1.6],
    [6, 2],
  ],
  [
    [4.5, 2.4],
    [4, 3.4],
    [3.5, 5.5],
  ],
  [
    [3.2, 7],
    [1.2, 7.2],
    [0.6, 5.6],
  ],
  [
    [0, 4.2],
    [-1.5, 4],
    [-3.5, 4.2],
  ],
  [
    [-7, 4.6],
    [-9.5, 3],
    [-9.3, 0.4],
  ],
  [
    [-9, -2.2],
    [-7, -3],
    [-6.5, -5],
  ],
  [
    [-6, -7],
    [-3.5, -7.2],
    [-2.8, -5.4],
  ],
  [
    [-2.2, -4],
    [0, -3.8],
    [2.5, -3.4],
  ],
  [
    [5, -3],
    [6.5, -2.4],
    [8, -2.2],
  ],
  [[9.4, -2], [10, -1.5], AMOEBA_START],
];

const EASE_SPLINE = '.45 0 .55 1';

function format(x: number, y: number): string {
  return `${x.toFixed(2)} ${y.toFixed(2)}`;
}

function outline(move: (point: PathPoint) => string): string {
  const curves = AMOEBA_CURVES.map((curve) => `C${curve.map(move).join(' ')}`);
  return `M${move(AMOEBA_START)}${curves.join('')}Z`;
}

function pushOut(point: PathPoint, offset: number): string {
  const [x, y] = point;
  const length = Math.hypot(x, y) || 1;
  return format(x + (x / length) * offset, y + (y / length) * offset);
}

export function amoebaOutline(phase: number, amplitude: number): string {
  return outline((point) => {
    const angle = Math.atan2(point[1], point[0]);
    const offset =
      amplitude * (0.55 * Math.sin(6 * angle - phase) + 0.45 * Math.sin(3 * angle + phase));
    return pushOut(point, offset);
  });
}

export function outlineFrames(frames: number, shape: (phase: number) => string): string {
  return Array.from({ length: frames + 1 }, (_, i) =>
    shape(((i % frames) / frames) * Math.PI * 2),
  ).join(';');
}

export interface Wander {
  values: string;
  keySplines: string;
}

export function wander(seed: number, radius: number, stops: number): Wander {
  const random = lcg(seed);
  const points = Array.from({ length: stops }, () => {
    const angle = random() * Math.PI * 2;
    const distance = radius * Math.sqrt(random());
    return format(Math.cos(angle) * distance, Math.sin(angle) * distance);
  });
  return {
    values: [...points, points[0]].join(';'),
    keySplines: Array.from({ length: stops }, () => EASE_SPLINE).join(';'),
  };
}
