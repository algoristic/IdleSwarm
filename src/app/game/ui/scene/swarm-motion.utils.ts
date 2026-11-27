import { TrekTransition } from './models/swarm.model';

export type Easing = (x: number) => number;

export const DEG = Math.PI / 180;
export const BOB_DURATIONS = [0, 5, 6.5, 4.2];
export const SWIM_DURATIONS = [0, 3.2, 2.6, 3.8];
export const TREK_DURATION_MS = 800;

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
  const f = (t: number, a: number, b: number): number =>
    3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;
  return (x) => {
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 18; i++) {
      const m = (lo + hi) / 2;
      if (f(m, x1, x2) < x) lo = m;
      else hi = m;
    }
    return f((lo + hi) / 2, y1, y2);
  };
}

export const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
export const EASE_OUT = cubicBezier(0, 0, 0.58, 1);

export function fraction(x: number): number {
  return x - Math.floor(x);
}

export function alternate(time: number, duration: number, delay: number): number {
  const p = (time + delay) / duration;
  const n = Math.floor(p);
  return EASE_IN_OUT(n % 2 ? 1 - (p - n) : p - n);
}

export function paddleAngle(p: number): number {
  if (p < 0.64) return 235 * EASE_IN_OUT(p / 0.64);
  if (p < 0.69) return 235 - 13 * EASE_OUT((p - 0.64) / 0.05);
  if (p < 0.75) return 222 + 4 * EASE_IN_OUT((p - 0.69) / 0.06);
  return 226 + 134 * EASE_IN_OUT((p - 0.75) / 0.25);
}

export function applyRoll(
  ctx: Pick<CanvasRenderingContext2D, 'rotate' | 'scale'>,
  time: number,
  duration: number,
  delay: number,
): void {
  const p = fraction((time + delay) / duration);
  const u = EASE_IN_OUT(p < 0.5 ? p / 0.5 : (p - 0.5) / 0.5);
  ctx.rotate((p < 0.5 ? -3 + 6 * u : 3 - 6 * u) * DEG);
  ctx.scale(1, p < 0.5 ? 1 - 0.26 * u : 0.74 + 0.26 * u);
}

export function trekAngle(trek: TrekTransition, now: number): number {
  return (
    trek.from + (trek.to - trek.from) * EASE_IN_OUT(Math.min(1, (now - trek.at) / TREK_DURATION_MS))
  );
}

function trekTarget(travelAngle: number | null): number {
  return travelAngle === null ? 0 : +travelAngle.toFixed(1);
}

export function nextTrek(
  trek: TrekTransition,
  travelAngle: number | null,
  now: number,
): TrekTransition {
  const to = trekTarget(travelAngle);
  return to === trek.to ? trek : { from: trekAngle(trek, now), to, at: now };
}

export function flowRotation(travelAngle: number | null): number {
  return travelAngle === null ? 0 : travelAngle + 90;
}
