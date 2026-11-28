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
import {
  DEGREES,
  figureRandom,
  randomWalk,
  SPRITE_EASE as EASE,
  unwrap,
  WalkArea,
  worldLight,
} from './figure.utils';

const TAU = Math.PI * 2;
const OUTLINE_POINTS = 36;
const FRAMES = 8;
const MAX_REACH = 9.6;
const CRAWL_POINTS = 12;
const STRETCH = { long: 0.08, wide: 0.06 } as const;
const INNER_FLOW = 0.8;

export const AMOEBA_VARIANT_COUNT = 5;
export const AMOEBA_SCALE = 3;
export const AMOEBA_STROKE = { glow: 2.4, rim: 0.85 } as const;
export const AMOEBA_TIMING = { outline: 6, nucleus: 8.5, vacuole: 3.8 } as const;
export const AMOEBA_CRAWL = { turn: (35 / 180) * Math.PI } as const;

export const AMOEBA_FLOW: Keyframes = {
  values: [0, INNER_FLOW, 0],
  keyTimes: [0, 0.5, 1],
  easing: EASE,
};

interface OutlineShape {
  base: number;
  lead: number;
  slant: number;
  side: number;
  sideAngle: number;
  folds: number;
  waves: number;
  skew: number;
  bulge: number;
  bulgeAngle: number;
  wrinkle: number;
  wrinkleShift: number;
}

export interface AmoebaEgg {
  key: number;
  at: Point;
  r: number;
  transform: string;
  highlight: Point;
}

export interface AmoebaCrawl {
  duration: number;
  x: Keyframes;
  y: Keyframes;
  rotation: Keyframes;
  translateValues: string;
  rotateValues: string;
  lightValues: string;
  keyTimes: string;
  keySplines: string;
}

export interface AmoebaVariant {
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
  eggs: readonly AmoebaEgg[];
}

function shapeRadius(shape: OutlineShape, scale: number) {
  return (angle: number, phase: number): number => {
    const rear = (1 - Math.cos(angle)) / 2;
    const front = Math.max(0, Math.cos(angle - shape.slant)) ** 3;
    const lead = (0.5 + 0.5 * Math.cos(phase)) ** 1.5;
    const probe =
      Math.max(0, Math.cos(angle - shape.sideAngle)) ** 4 * (0.5 - 0.5 * Math.cos(phase));
    const flank = 0.35 + 0.65 * Math.sin(angle) ** 2;
    const fold =
      (0.5 + 0.5 * Math.sin(shape.waves * Math.PI * rear - phase + shape.skew * Math.sin(angle))) **
      4;
    const wrinkle = rear ** 4 * Math.sin(7 * angle + shape.wrinkleShift);
    return (
      scale *
        (shape.base +
          shape.lead * front * (0.45 + 0.55 * lead) +
          shape.side * probe +
          shape.folds * flank * fold +
          shape.wrinkle * wrinkle) +
      1.1 * Math.cos(angle) +
      shape.bulge * Math.sin(angle - shape.bulgeAngle)
    );
  };
}

function stretched(points: Point[], phase: number, shift = 0): Point[] {
  const push = 0.5 - 0.5 * Math.cos(phase);
  const long = 1 + STRETCH.long * push;
  const wide = 1 - STRETCH.wide * push;
  return points.map(([x, y]): Point => [x * long + shift * push, y * wide]);
}

function reachOf(outline: (phase: number) => Point[]): number {
  let reach = 0;
  for (let i = 0; i < 32; i++) {
    for (const [x, y] of outline((i / 32) * TAU)) reach = Math.max(reach, Math.abs(x), Math.abs(y));
  }
  return reach;
}

function scaled(points: Point[], factor: number): Point[] {
  return points.map(([x, y]): Point => [x * factor, y * factor]);
}

const VARIANT_ZERO: OutlineShape = {
  base: 5,
  lead: 3.4,
  slant: -0.2,
  side: 1.4,
  sideAngle: 1.1,
  folds: 2,
  waves: 3,
  skew: 0.9,
  bulge: 0.5,
  bulgeAngle: 0.9,
  wrinkle: 0.35,
  wrinkleShift: 0.4,
};

function variantShape(index: number): OutlineShape {
  if (index === 0) return VARIANT_ZERO;
  const random = lcg(index * 104729 + 17);
  return {
    base: 4.7 + random() * 0.6,
    lead: 2.8 + random() * 1.2,
    slant: (random() - 0.5) * 0.7,
    side: 0.8 + random() * 1.4,
    sideAngle: (random() < 0.5 ? -1 : 1) * (0.7 + random() * 0.6),
    folds: 1.6 + random() * 0.8,
    waves: 2.6 + random() * 1,
    skew: 0.5 + random() * 0.8,
    bulge: 0.3 + random() * 0.4,
    bulgeAngle: random() * TAU,
    wrinkle: 0.2 + random() * 0.25,
    wrinkleShift: random() * TAU,
  };
}

const EGG_SLOTS: readonly Point[] = [
  [3, 1.9],
  [-3.2, -1.9],
  [2.3, -2.6],
];

function amoebaVariant(index: number): AmoebaVariant {
  const shape = variantShape(index);
  const random = lcg(index * 7727 + 3);
  const rawOutline = (phase: number): Point[] =>
    stretched(radialPoints(OUTLINE_POINTS, shapeRadius(shape, 1), phase, 0.86, [-1, 0]), phase);
  const fit = Math.min(1, MAX_REACH / reachOf(rawOutline));
  const outline = (phase: number): Point[] => scaled(rawOutline(phase), fit);
  const inner = (phase: number): Point[] =>
    scaled(
      stretched(
        radialPoints(OUTLINE_POINTS, shapeRadius(shape, 0.67), phase - 0.5, 0.8, [-1.5, 0.4]),
        phase,
        INNER_FLOW,
      ),
      fit,
    );
  const spread = index === 0 ? 0 : 1;
  const jitter = (range: number): number => (random() - 0.5) * 2 * range * spread;
  const nucleus: Point = [-0.5 + jitter(0.7), 0.3 + jitter(0.6)];
  const vacuole: Point = [-3.8 + jitter(0.5), (index % 2 === 0 ? 1.9 : -1.9) + jitter(0.4)];
  const eggCount = index === 0 ? 3 : 2 + Math.floor(random() * 2);
  const eggs = EGG_SLOTS.slice(0, eggCount).map(([x, y], key): AmoebaEgg => {
    const at: Point = [(x + jitter(0.4)) * fit, (index % 2 === 0 ? y : -y) * fit + jitter(0.3)];
    const r = +(1.5 + (index === 0 ? 0.2 : random() * 0.4)).toFixed(2);
    return {
      key,
      at,
      r,
      transform: `translate(${formatPoint(at)})`,
      highlight: [-0.4 * r, -0.4 * r],
    };
  });
  const nucleusPath = wander(61 + index * 13, 0.7, 5);
  const times = evenKeyTimes(nucleusPath.points.length);
  return {
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
    eggs,
  };
}

export const AMOEBA_VARIANTS: readonly AmoebaVariant[] = Array.from(
  { length: AMOEBA_VARIANT_COUNT },
  (_, i) => amoebaVariant(i),
);

export function amoebaVariantFor(index: number): number {
  return Math.floor(figureRandom(index * 7919 + 13) * AMOEBA_VARIANT_COUNT);
}

export function amoebaPhaseOffset(index: number): number {
  return figureRandom(index * 4241 + 7) * AMOEBA_TIMING.nucleus;
}

export function amoebaCrawl(index: number, area: WalkArea): AmoebaCrawl {
  const points = randomWalk(
    { seed: index * 3571 + 29, points: CRAWL_POINTS, turn: AMOEBA_CRAWL.turn },
    area,
  );
  const directions: number[] = [];
  for (let i = 0; i < CRAWL_POINTS; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const angle = Math.atan2(y1 - y0, x1 - x0) * DEGREES;
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
    duration: CRAWL_POINTS * AMOEBA_TIMING.outline,
    x: { values: points.map(([x]) => x), keyTimes: times, easing: EASE },
    y: { values: points.map(([, y]) => y), keyTimes: times, easing: EASE },
    rotation: { values: rotations, keyTimes: times, easing: EASE },
    translateValues: points.map(formatPoint).join(';'),
    rotateValues: rotations.map(formatCoord).join(';'),
    lightValues: rotations.map((angle) => formatPoint(worldLight(angle))).join(';'),
    keyTimes: times.map((t) => +t.toFixed(4)).join(';'),
    keySplines: easeSplines(CRAWL_POINTS),
  };
}
