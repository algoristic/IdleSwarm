import { cubicBezier } from '../easing.utils';
import { evenKeyTimes, Keyframes } from '../keyframes.utils';
import {
  easeSplines,
  formatCoord,
  formatPoint,
  loopFrames,
  Point,
  radialPoints,
  smoothPath,
  wander,
  Wander,
} from '../path.utils';
import { lcg } from '../shape.utils';

const TAU = Math.PI * 2;
const OUTLINE_POINTS = 36;
const FRAMES = 8;
const MAX_REACH = 9.6;
const CRAWL_POINTS = 12;
const CRAWL_TURN = (70 / 180) * Math.PI;
const DEGREES = 180 / Math.PI;

export const EATER_VARIANT_COUNT = 5;
export const EATER_TIMING = { outline: 6, nucleus: 8.5, vacuole: 3.8 } as const;
export const EATER_DETAILS = ['full', 'reduced'] as const;
export type EaterDetail = (typeof EATER_DETAILS)[number];

const EASE = cubicBezier(0.45, 0, 0.55, 1);

export const VACUOLE_PULSE: Keyframes = {
  values: [1, 1.2, 0.3, 1],
  keyTimes: [0, 0.6, 0.72, 1],
  easing: EASE,
};

interface OutlineShape {
  base: number;
  lobes: number;
  reach: number;
  bulge: number;
  bulgeAngle: number;
  ripple: number;
  rippleAngle: number;
  waveShift: number;
  secondShift: number;
}

export interface EaterAlga {
  key: number;
  at: Point;
  rotation: number;
  transform: string;
  cells: readonly number[];
}

export interface CrawlArea {
  start: Point;
  inner: number;
  outer: number;
  step: number;
}

export interface EaterCrawl {
  duration: number;
  x: Keyframes;
  y: Keyframes;
  rotation: Keyframes;
  translateValues: string;
  rotateValues: string;
  keyTimes: string;
  keySplines: string;
}

export interface EaterVariant {
  heading: number;
  outline: (phase: number) => Point[];
  inner: (phase: number) => Point[];
  body: string;
  bodyFrames: string;
  innerPath: string;
  innerFrames: string;
  nucleus: Point;
  nucleusTransform: string;
  nucleusPath: Wander;
  nucleusX: Keyframes;
  nucleusY: Keyframes;
  vacuole: Point;
  vacuoleTransform: string;
  algae: readonly EaterAlga[];
}

function shapeRadius(shape: OutlineShape, base: number, lobes: number) {
  return (angle: number, phase: number): number => {
    const reach = 0.55 + 0.45 * Math.cos(angle - shape.reach);
    const wave = (0.5 + 0.5 * Math.sin(4 * angle - phase + shape.waveShift)) ** 4;
    const second = (0.5 + 0.5 * Math.sin(3 * angle + shape.secondShift - 2 * phase)) ** 4;
    return (
      base +
      1.1 * Math.cos(angle) +
      shape.bulge * Math.sin(angle - shape.bulgeAngle) +
      shape.ripple * Math.cos(3 * angle + shape.rippleAngle) +
      lobes * reach * (0.6 * wave + 0.4 * second)
    );
  };
}

function reachOf(outline: (phase: number) => Point[]): number {
  let reach = 0;
  for (let i = 0; i < 32; i++) {
    for (const [x, y] of outline((i / 32) * TAU)) reach = Math.max(reach, Math.abs(x), Math.abs(y));
  }
  return reach;
}

function headingOf(outline: (phase: number) => Point[]): number {
  let x = 0;
  let y = 0;
  for (let i = 0; i < 16; i++) {
    for (const [px, py] of outline((i / 16) * TAU)) {
      const weight = px * px + py * py;
      x += px * weight;
      y += py * weight;
    }
  }
  return Math.atan2(y, x) * DEGREES;
}

function scaled(points: Point[], factor: number): Point[] {
  return points.map(([x, y]): Point => [x * factor, y * factor]);
}

const VARIANT_ZERO: OutlineShape = {
  base: 4.9,
  lobes: 4,
  reach: 0.6,
  bulge: 0.6,
  bulgeAngle: 0.9,
  ripple: 0.45,
  rippleAngle: 1.3,
  waveShift: 0,
  secondShift: 1,
};

function variantShape(index: number): OutlineShape {
  if (index === 0) return VARIANT_ZERO;
  const random = lcg(index * 104729 + 17);
  return {
    base: 4.6 + random() * 0.6,
    lobes: 3.4 + random() * 1.2,
    reach: (random() - 0.5) * 2,
    bulge: 0.4 + random() * 0.5,
    bulgeAngle: random() * TAU,
    ripple: 0.3 + random() * 0.3,
    rippleAngle: random() * TAU,
    waveShift: random() * TAU,
    secondShift: random() * TAU,
  };
}

function algaCells(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i - (count - 1) / 2) * 1.05);
}

function eaterVariant(index: number): EaterVariant {
  const shape = variantShape(index);
  const random = lcg(index * 7727 + 3);
  const rawOutline = (phase: number): Point[] =>
    radialPoints(OUTLINE_POINTS, shapeRadius(shape, shape.base, shape.lobes), phase, 0.86, [-1, 0]);
  const fit = Math.min(1, MAX_REACH / reachOf(rawOutline));
  const outline = (phase: number): Point[] => scaled(rawOutline(phase), fit);
  const inner = (phase: number): Point[] =>
    scaled(
      radialPoints(
        OUTLINE_POINTS,
        shapeRadius(shape, shape.base * 0.67, shape.lobes * 0.68),
        phase - 0.5,
        0.8,
        [-1.5, 0.4],
      ),
      fit,
    );
  const spread = index === 0 ? 0 : 1;
  const jitter = (range: number): number => (random() - 0.5) * 2 * range * spread;
  const nucleus: Point = [-1.2 + jitter(0.7), 0.4 + jitter(0.6)];
  const vacuole: Point = [-3.8 + jitter(0.5), (index % 2 === 0 ? 1.9 : -1.9) + jitter(0.4)];
  const slots: Point[] = [
    [1.6, 2],
    [-3.6, -1.8],
  ];
  const algae = slots.map(([x, y], key): EaterAlga => {
    const at: Point = [(x + jitter(0.5)) * fit, (index % 2 === 0 ? y : -y) * fit + jitter(0.4)];
    const rotation = Math.round(jitter(90));
    return {
      key,
      at,
      rotation,
      transform: `translate(${formatPoint(at)}) rotate(${rotation})`,
      cells: algaCells(1 + Math.floor(random() * 3)),
    };
  });
  const nucleusPath = wander(61 + index * 13, 0.7, 5);
  const times = evenKeyTimes(nucleusPath.points.length);
  return {
    heading: headingOf(outline),
    outline,
    inner,
    body: smoothPath(outline(0)),
    bodyFrames: loopFrames(FRAMES, (phase) => smoothPath(outline(phase))),
    innerPath: smoothPath(inner(0)),
    innerFrames: loopFrames(FRAMES, (phase) => smoothPath(inner(phase))),
    nucleus,
    nucleusTransform: `translate(${formatPoint(nucleus)})`,
    nucleusPath,
    nucleusX: { values: nucleusPath.points.map(([x]) => x), keyTimes: times, easing: EASE },
    nucleusY: { values: nucleusPath.points.map(([, y]) => y), keyTimes: times, easing: EASE },
    vacuole,
    vacuoleTransform: `translate(${formatPoint(vacuole)})`,
    algae,
  };
}

export const EATER_VARIANTS: readonly EaterVariant[] = Array.from(
  { length: EATER_VARIANT_COUNT },
  (_, i) => eaterVariant(i),
);

function figureRandom(seed: number): number {
  const random = lcg(seed);
  random();
  return random();
}

export function eaterVariantFor(index: number): number {
  return Math.floor(figureRandom(index * 7919 + 13) * EATER_VARIANT_COUNT);
}

export function eaterPhaseOffset(index: number): number {
  return figureRandom(index * 4241 + 7) * EATER_TIMING.nucleus;
}

function unwrap(angle: number, previous: number): number {
  return angle + Math.round((previous - angle) / 360) * 360;
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

function crawlWalk(index: number, { start, inner, outer, step }: CrawlArea): Point[] {
  const random = lcg(index * 3571 + 29);
  random();
  let direction = random() * TAU;
  const walk: Point[] = [start];
  for (let i = 0; i < CRAWL_POINTS; i++) {
    const [x, y] = walk[i];
    const home = Math.atan2(start[1] - y, start[0] - x);
    const pull = i < CRAWL_POINTS / 2 ? 0 : (i - CRAWL_POINTS / 2 + 1) / (CRAWL_POINTS / 2);
    direction += unwrapRadians(home - direction) * pull + (random() - 0.5) * 2 * CRAWL_TURN;
    const length = step * (0.7 + random() * 0.6);
    walk.push([x + Math.cos(direction) * length, y + Math.sin(direction) * length]);
  }
  const [gapX, gapY] = [walk[CRAWL_POINTS][0] - start[0], walk[CRAWL_POINTS][1] - start[1]];
  return walk.map(([x, y], i): Point => {
    if (i === 0 || i === CRAWL_POINTS) return [0, 0];
    const share = i / CRAWL_POINTS;
    const [cx, cy] = clampToRing([x - gapX * share, y - gapY * share], inner, outer);
    return [cx - start[0], cy - start[1]];
  });
}

export function eaterCrawl(index: number, area: CrawlArea): EaterCrawl {
  const points = crawlWalk(index, area);
  const offset = EATER_VARIANTS[eaterVariantFor(index)].heading;
  const directions: number[] = [];
  for (let i = 0; i < CRAWL_POINTS; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const angle = Math.atan2(y1 - y0, x1 - x0) * DEGREES - offset;
    directions.push(i === 0 ? angle : unwrap(angle, directions[i - 1]));
  }
  const turn = unwrap(directions[0], directions[CRAWL_POINTS - 1]) - directions[0];
  const first = (directions[CRAWL_POINTS - 1] - turn + directions[0]) / 2;
  const rotations = [
    first,
    ...directions.slice(1).map((angle, i) => (directions[i] + angle) / 2),
    first + turn,
  ];
  const times = evenKeyTimes(points.length);
  return {
    duration: CRAWL_POINTS * EATER_TIMING.outline,
    x: { values: points.map(([x]) => x), keyTimes: times, easing: EASE },
    y: { values: points.map(([, y]) => y), keyTimes: times, easing: EASE },
    rotation: { values: rotations, keyTimes: times, easing: EASE },
    translateValues: points.map(formatPoint).join(';'),
    rotateValues: rotations.map(formatCoord).join(';'),
    keyTimes: times.map((t) => +t.toFixed(4)).join(';'),
    keySplines: easeSplines(CRAWL_POINTS),
  };
}
