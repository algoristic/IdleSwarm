import { cubicBezier } from '../art/easing.utils';
import { TrekTransition } from './models/swarm.model';

export const DEG = Math.PI / 180;
export const BOB_DURATIONS = [0, 5, 6.5, 4.2];
export const SWIM_DURATIONS = [0, 3.2, 2.6, 3.8];
export const TREK_DURATION_MS = 800;

export const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);

export function fraction(x: number): number {
  return x - Math.floor(x);
}

export function alternate(time: number, duration: number, delay: number): number {
  const p = (time + delay) / duration;
  const n = Math.floor(p);
  return EASE_IN_OUT(n % 2 ? 1 - (p - n) : p - n);
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
