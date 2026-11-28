import { cubicBezier } from '../easing.utils';
import { Keyframes } from '../keyframes.utils';
import { Point } from '../path.utils';
import { lcg } from '../shape.utils';

const TAU = Math.PI * 2;
const LIGHT: Point = [-0.5, -1.1];

export const DEGREES = 180 / Math.PI;
export const SPRITE_EASE = cubicBezier(0.45, 0, 0.55, 1);
export const SPRITE_LIGHT = `translate(${LIGHT.join(' ')})`;

export const VACUOLE_PULSE: Keyframes = {
  values: [1, 1.2, 0.3, 1],
  keyTimes: [0, 0.6, 0.72, 1],
  easing: SPRITE_EASE,
};

export interface WalkArea {
  start: Point;
  inner: number;
  outer: number;
  step: number;
}

export interface WalkShape {
  seed: number;
  points: number;
  turn: number;
}

export interface SpriteLight {
  start: string;
  values: string;
  keyTimes: string;
  keySplines: string | null;
  calcMode: 'spline' | 'linear';
  duration: string;
  begin: string;
}

export function worldLight(rotation: number): Point {
  const turn = -rotation / DEGREES;
  const [x, y] = LIGHT;
  return [x * Math.cos(turn) - y * Math.sin(turn), x * Math.sin(turn) + y * Math.cos(turn)];
}

export function unwrap(angle: number, previous: number): number {
  return angle + Math.round((previous - angle) / 360) * 360;
}

export function figureRandom(seed: number): number {
  const random = lcg(seed);
  random();
  return random();
}

function unwrapRadians(angle: number): number {
  return angle - Math.round(angle / TAU) * TAU;
}

function clampToRing([x, y]: Point, inner: number, outer: number): Point {
  const distance = Math.hypot(x, y);
  if (distance === 0) return [inner, 0];
  const factor = Math.min(outer, Math.max(inner, distance)) / distance;
  return [x * factor, y * factor];
}

export function randomWalk(
  { seed, points, turn }: WalkShape,
  { start, inner, outer, step }: WalkArea,
): Point[] {
  const random = lcg(seed);
  random();
  let direction = random() * TAU;
  const walk: Point[] = [start];
  for (let i = 0; i < points; i++) {
    const [x, y] = walk[i];
    const home = Math.atan2(start[1] - y, start[0] - x);
    const pull = i < points / 2 ? 0 : (i - points / 2 + 1) / (points / 2);
    direction += unwrapRadians(home - direction) * pull + (random() - 0.5) * 2 * turn;
    const length = step * (0.7 + random() * 0.6);
    walk.push([x + Math.cos(direction) * length, y + Math.sin(direction) * length]);
  }
  const [gapX, gapY] = [walk[points][0] - start[0], walk[points][1] - start[1]];
  return walk.map(([x, y], i): Point => {
    if (i === 0 || i === points) return [0, 0];
    const share = i / points;
    const [cx, cy] = clampToRing([x - gapX * share, y - gapY * share], inner, outer);
    return [cx - start[0], cy - start[1]];
  });
}

export function smilBegin(seconds: number, duration: number): string {
  return `-${(((seconds % duration) + duration) % duration).toFixed(2)}s`;
}
