import { lcg } from './shape.utils';

const TAU = Math.PI * 2;
const EASE_SPLINE = '.45 0 .55 1';

export type Point = readonly [number, number];
export type PathSegment = readonly [Point, Point, Point, Point];

export interface Wander {
  values: string;
  keySplines: string;
  points: readonly Point[];
}

export interface WaveOptions {
  start: Point;
  angle: number;
  length: number;
  amplitude: number;
  wavelength: number;
  bend?: number;
  steps?: number;
}

export interface OutlineSample {
  point: Point;
  normal: Point;
}

export function formatCoord(value: number): string {
  const text = value.toFixed(2);
  return text === '-0.00' ? '0.00' : text;
}

export function formatPoint([x, y]: Point): string {
  return `${formatCoord(x)} ${formatCoord(y)}`;
}

export function smoothSegments(points: readonly Point[], closed = true): PathSegment[] {
  const n = points.length;
  const at = (i: number): Point =>
    closed ? points[(i + n) % n] : points[Math.max(0, Math.min(n - 1, i))];
  return Array.from({ length: closed ? n : n - 1 }, (_, i) => {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    return [p1, c1, c2, p2] as const;
  });
}

export function smoothPath(points: readonly Point[], closed = true): string {
  const curves = smoothSegments(points, closed).map(
    ([, c1, c2, p2]) => `C${formatPoint(c1)} ${formatPoint(c2)} ${formatPoint(p2)}`,
  );
  return `M${formatPoint(points[0])}${curves.join('')}${closed ? 'Z' : ''}`;
}

function bezier([p1, c1, c2, p2]: PathSegment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * p1[0] + b * c1[0] + c * c2[0] + d * p2[0],
    a * p1[1] + b * c1[1] + c * c2[1] + d * p2[1],
  ];
}

function signedArea(points: readonly Point[]): number {
  return points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    return sum + x * ny - nx * y;
  }, 0);
}

export function outlineSamples(points: readonly Point[], perSegment: number): OutlineSample[] {
  const curve = smoothSegments(points, true).flatMap((segment) =>
    Array.from({ length: perSegment }, (_, i) => bezier(segment, i / perSegment)),
  );
  const outward = signedArea(points) > 0 ? 1 : -1;
  return curve.map((point, i) => {
    const prev = curve[(i - 1 + curve.length) % curve.length];
    const next = curve[(i + 1) % curve.length];
    const tx = next[0] - prev[0];
    const ty = next[1] - prev[1];
    const length = Math.hypot(tx, ty) || 1;
    return { point, normal: [(outward * ty) / length, (-outward * tx) / length] };
  });
}

export function ciliaFringe(
  samples: readonly OutlineSample[],
  length: number,
  tilt: number,
  waves: number,
  phase: number,
): string {
  return samples
    .map(({ point, normal }, i) => {
      const angle = tilt * Math.sin((waves * TAU * i) / samples.length - phase);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const dx = (normal[0] * cos - normal[1] * sin) * length;
      const dy = (normal[0] * sin + normal[1] * cos) * length;
      return `M${formatPoint(point)}l${formatCoord(dx)} ${formatCoord(dy)}`;
    })
    .join('');
}

export function wavePath(options: WaveOptions, phase: number): string {
  const { start, angle, length, amplitude, wavelength, bend = 0, steps = 16 } = options;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const points = Array.from({ length: steps + 1 }, (_, i): Point => {
    const s = (length * i) / steps;
    const along = s / length;
    const side =
      amplitude * (0.2 + 0.8 * along) * Math.sin((TAU * s) / wavelength - phase) +
      bend * (1 - (2 * along - 1) ** 2);
    return [start[0] + s * cos - side * sin, start[1] + s * sin + side * cos];
  });
  return smoothPath(points, false);
}

export function loopFrames(frames: number, shape: (phase: number) => string): string {
  return Array.from({ length: frames + 1 }, (_, i) => shape(((i % frames) / frames) * TAU)).join(
    ';',
  );
}

export function easeSplines(segmentCount: number): string {
  return Array.from({ length: segmentCount }, () => EASE_SPLINE).join(';');
}

export function wander(seed: number, radius: number, stops: number): Wander {
  const random = lcg(seed);
  const points = Array.from({ length: stops }, (): Point => {
    const angle = random() * TAU;
    const distance = radius * Math.sqrt(random());
    return [Math.cos(angle) * distance, Math.sin(angle) * distance];
  });
  const values = points.map(formatPoint);
  return {
    values: [...values, values[0]].join(';'),
    keySplines: easeSplines(stops),
    points: [...points, points[0]],
  };
}

export function radialPoints(
  count: number,
  radius: (angle: number, phase: number) => number,
  phase: number,
  squash = 1,
  center: Point = [0, 0],
): Point[] {
  return Array.from({ length: count }, (_, i): Point => {
    const angle = (i / count) * TAU;
    const r = radius(angle, phase);
    return [center[0] + Math.cos(angle) * r, center[1] + Math.sin(angle) * r * squash];
  });
}

export function radialOutline(
  count: number,
  radius: (angle: number, phase: number) => number,
  phase: number,
  squash = 1,
  center: Point = [0, 0],
): string {
  return smoothPath(radialPoints(count, radius, phase, squash, center));
}
