import { evenKeyTimes, Keyframes } from '../keyframes.utils';
import {
  easeSplines,
  formatCoord,
  formatPoint,
  loopFrames,
  outlineSamples,
  OutlineSample,
  Point,
  smoothPath,
  wander,
  Wander,
} from '../path.utils';
import { lcg } from '../shape.utils';
import { DEGREES, figureRandom, SPRITE_EASE, unwrap, worldLight } from './figure.utils';

const TAU = Math.PI * 2;
const OUTLINE_POINTS = 28;
const CILIA_FRAMES = 8;
const CILIA = { length: 1.1, lean: 0.55, tilt: 0.5, waves: 3, tuftFrom: 0.93 } as const;
const TUFT = { count: 5, length: 1.9, spread: 0.24, sway: 0.18 } as const;
const CYCLOSIS_STOPS = 16;
const SWIM = { dense: 720, samples: 96, lights: 48 } as const;
const ORBIT_WAVES = [
  { k: 2, share: 0.25 },
  { k: 3, share: 0.15 },
  { k: 5, share: 0.07 },
] as const;
const LINEAR = (x: number): number => x;

export const PARAMECIUM_VARIANT_COUNT = 5;
export const PARAMECIUM_TIMING = { cilia: 1.1, roll: 2.4, cyclosis: 10, vacuole: 2.6 } as const;
export const PARAMECIUM_WOBBLE = 1.2;

export const PARAMECIUM_ROLL: Keyframes = {
  values: [0, 1, 0],
  keyTimes: [0, 0.5, 1],
  easing: SPRITE_EASE,
};

export const PARAMECIUM_ROLL_SMIL = {
  groove: '0 0;0 -1.1;0 0',
  width: '1 1;1 .94;1 1',
  wobble: `0 ${-PARAMECIUM_WOBBLE};0 ${PARAMECIUM_WOBBLE};0 ${-PARAMECIUM_WOBBLE}`,
  keyTimes: '0;.5;1',
  keySplines: easeSplines(2),
} as const;

interface ParameciumShape {
  length: number;
  width: number;
  bend: number;
  groove: number;
  foods: number;
  ciliaShift: number;
}

export interface ParameciumFood {
  key: number;
  r: number;
  delay: number;
}

export interface ParameciumVacuole {
  key: number;
  at: Point;
  transform: string;
  delay: number;
}

export interface ParameciumVariant {
  length: number;
  outline: readonly Point[];
  body: string;
  inner: string;
  innerPoints: readonly Point[];
  groove: string;
  groovePoints: readonly Point[];
  mouth: Point;
  gullet: string;
  gulletPoints: readonly Point[];
  cilia: (phase: number) => readonly (readonly [Point, Point])[];
  ciliaPath: string;
  ciliaFrames: string;
  nucleus: Point;
  nucleusTransform: string;
  nucleusPath: Wander;
  nucleusX: Keyframes;
  nucleusY: Keyframes;
  cyclosisX: Keyframes;
  cyclosisY: Keyframes;
  cyclosisValues: string;
  cyclosisKeyTimes: string;
  foods: readonly ParameciumFood[];
  vacuoles: readonly ParameciumVacuole[];
}

export interface SwimArea {
  start: Point;
  inner: number;
  outer: number;
  speed: number;
}

export interface ParameciumSwim {
  duration: number;
  path: string;
  x: Keyframes;
  y: Keyframes;
  rotation: Keyframes;
  lightValues: string;
  lightKeyTimes: string;
}

const VARIANT_ZERO: ParameciumShape = {
  length: 9.8,
  width: 4.2,
  bend: 0.25,
  groove: 1.2,
  foods: 4,
  ciliaShift: 0,
};

function variantShape(index: number): ParameciumShape {
  if (index === 0) return VARIANT_ZERO;
  const random = lcg(index * 92821 + 5);
  return {
    length: 8.8 + random() * 1.2,
    width: 3.6 + random() * 0.9,
    bend: (random() - 0.5) * 1.3,
    groove: 0.8 + random() * 0.7,
    foods: 3 + Math.floor(random() * 3),
    ciliaShift: random() * TAU,
  };
}

function outlineOf({ length, width, bend, groove }: ParameciumShape): Point[] {
  return Array.from({ length: OUTLINE_POINTS }, (_, i): Point => {
    const angle = (i / OUTLINE_POINTS) * TAU;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    const rear = (1 - c) / 2;
    const blunt = 0.68 + 0.22 * rear;
    const profile = 0.82 + 0.5 * rear - 0.72 * rear ** 3;
    const notch = groove * Math.max(0, s) ** 2 * Math.exp(-(((c - 0.35) / 0.35) ** 2));
    const x = length * Math.sign(c) * Math.abs(c) ** blunt;
    return [x, width * Math.sign(s) * Math.abs(s) ** 0.92 * profile - notch + bend * (1 - c * c)];
  });
}

function rearTangent({ normal }: OutlineSample): Point {
  const [nx, ny] = normal;
  return -ny < 0 ? [-ny, nx] : [ny, -nx];
}

function ciliaOf(
  shape: ParameciumShape,
  samples: readonly OutlineSample[],
): (phase: number) => (readonly [Point, Point])[] {
  return (phase) => {
    const lines: (readonly [Point, Point])[] = [];
    for (const sample of samples) {
      const [x, y] = sample.point;
      const along = (shape.length - x) / (2 * shape.length);
      if (along > CILIA.tuftFrom) continue;
      const wave = Math.sin(CILIA.waves * TAU * along - phase + shape.ciliaShift);
      const beta = CILIA.lean + CILIA.tilt * wave;
      const [tx, ty] = rearTangent(sample);
      const [nx, ny] = sample.normal;
      const dx = (nx * Math.cos(beta) + tx * Math.sin(beta)) * CILIA.length;
      const dy = (ny * Math.cos(beta) + ty * Math.sin(beta)) * CILIA.length;
      lines.push([
        [x, y],
        [dx, dy],
      ]);
    }
    const tip: Point = [-shape.length + 0.3, shape.bend * 0.1];
    for (let k = 0; k < TUFT.count; k++) {
      const spread = (k - (TUFT.count - 1) / 2) * TUFT.spread;
      const angle = Math.PI + spread + TUFT.sway * Math.sin(phase + k * 0.7);
      lines.push([tip, [Math.cos(angle) * TUFT.length, Math.sin(angle) * TUFT.length]]);
    }
    return lines;
  };
}

function ciliaPathOf(lines: readonly (readonly [Point, Point])[]): string {
  return lines
    .map(([p, [dx, dy]]) => `M${formatPoint(p)}l${formatCoord(dx)} ${formatCoord(dy)}`)
    .join('');
}

function parameciumVariant(index: number): ParameciumVariant {
  const shape = variantShape(index);
  const random = lcg(index * 6151 + 19);
  const { length: a, width: b } = shape;
  const outline = outlineOf(shape);
  const innerPoints = outline.map(([x, y]): Point => [x * 0.76 - 0.5, y * 0.62 - 0.15]);
  const groovePoints: Point[] = [
    [a * 0.8, b * 0.36],
    [a * 0.46, b * 0.14],
    [a * 0.04, b * 0.24],
    [a * 0.1, b * 0.46],
    [a * 0.5, b * 0.56],
  ];
  const mouth: Point = [a * 0.02, b * 0.3];
  const gulletPoints: Point[] = [mouth, [-a * 0.12, b * 0.12], [-a * 0.2, -b * 0.02]];
  const cilia = ciliaOf(shape, outlineSamples(outline, 2));
  const cyclosis = Array.from({ length: CYCLOSIS_STOPS + 1 }, (_, i): Point => {
    const angle = -((i % CYCLOSIS_STOPS) / CYCLOSIS_STOPS) * TAU + 0.9;
    return [-0.8 + Math.cos(angle) * a * 0.56, -0.25 + Math.sin(angle) * b * 0.42];
  });
  const cyclosisTimes = evenKeyTimes(cyclosis.length);
  const nucleus: Point = [-a * 0.06, -b * 0.08];
  const nucleusPath = wander(37 + index * 11, 0.4, 5);
  const nucleusTimes = evenKeyTimes(nucleusPath.points.length);
  const vacuoleAt: Point[] = [
    [a * (0.48 + (random() - 0.5) * 0.1), -b * 0.4],
    [-a * (0.52 + (random() - 0.5) * 0.1), -b * 0.34],
  ];
  return {
    length: a,
    outline,
    body: smoothPath(outline),
    inner: smoothPath(innerPoints),
    innerPoints,
    groove: smoothPath(groovePoints),
    groovePoints,
    mouth,
    gullet: smoothPath(gulletPoints, false),
    gulletPoints,
    cilia,
    ciliaPath: ciliaPathOf(cilia(0)),
    ciliaFrames: loopFrames(CILIA_FRAMES, (phase) => ciliaPathOf(cilia(phase))),
    nucleus,
    nucleusTransform: `translate(${formatPoint(nucleus)})`,
    nucleusPath,
    nucleusX: {
      values: nucleusPath.points.map(([x]) => x),
      keyTimes: nucleusTimes,
      easing: SPRITE_EASE,
    },
    nucleusY: {
      values: nucleusPath.points.map(([, y]) => y),
      keyTimes: nucleusTimes,
      easing: SPRITE_EASE,
    },
    cyclosisX: { values: cyclosis.map(([x]) => x), keyTimes: cyclosisTimes, easing: LINEAR },
    cyclosisY: { values: cyclosis.map(([, y]) => y), keyTimes: cyclosisTimes, easing: LINEAR },
    cyclosisValues: cyclosis.map(formatPoint).join(';'),
    cyclosisKeyTimes: cyclosisTimes.map((t) => +t.toFixed(4)).join(';'),
    foods: Array.from({ length: shape.foods }, (_, key): ParameciumFood => ({
      key,
      r: +(0.6 + random() * 0.45).toFixed(2),
      delay: +((key / shape.foods + random() * 0.08) * PARAMECIUM_TIMING.cyclosis).toFixed(2),
    })),
    vacuoles: vacuoleAt.map((at, key): ParameciumVacuole => ({
      key,
      at,
      transform: `translate(${formatPoint(at)})`,
      delay: key * (PARAMECIUM_TIMING.vacuole / 2),
    })),
  };
}

export const PARAMECIUM_VARIANTS: readonly ParameciumVariant[] = Array.from(
  { length: PARAMECIUM_VARIANT_COUNT },
  (_, i) => parameciumVariant(i),
);

export const VACUOLE_CANALS = Array.from({ length: 5 }, (_, k) => {
  const angle = (k / 5) * TAU - Math.PI / 2;
  const from: Point = [Math.cos(angle) * 0.5, Math.sin(angle) * 0.5];
  const to: Point = [Math.cos(angle) * 1.25, Math.sin(angle) * 1.25];
  return [from, to] as const;
});

export const VACUOLE_CANAL_PATH = VACUOLE_CANALS.map(
  ([from, to]) => `M${formatPoint(from)}L${formatPoint(to)}`,
).join('');

export function parameciumVariantFor(index: number): number {
  return Math.floor(figureRandom(index * 6971 + 31) * PARAMECIUM_VARIANT_COUNT);
}

export function parameciumPhaseOffset(index: number): number {
  return figureRandom(index * 3989 + 23) * PARAMECIUM_TIMING.cyclosis;
}

function orbitPoint(orbit: Orbit, t: number): Point {
  const wave = orbit.waves.reduce(
    (sum, { k, a, phase }) => sum + a * (Math.sin(k * t + phase) - Math.sin(phase)),
    0,
  );
  const angle = orbit.angle + orbit.sense * t;
  const radius = orbit.radius + wave;
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

interface Orbit {
  angle: number;
  sense: number;
  radius: number;
  waves: readonly { k: number; a: number; phase: number }[];
}

export function parameciumSwim(
  index: number,
  { start, inner, outer, speed }: SwimArea,
): ParameciumSwim {
  const random = lcg(index * 2731 + 11);
  random();
  const radius = Math.min(outer, Math.max(inner, Math.hypot(start[0], start[1])));
  const room = Math.max(0, Math.min(radius - inner, outer - radius));
  const orbit: Orbit = {
    angle: Math.atan2(start[1], start[0]),
    sense: random() < 0.5 ? -1 : 1,
    radius,
    waves: ORBIT_WAVES.map(({ k, share }) => ({
      k,
      a: room * share * (0.6 + 0.4 * random()),
      phase: random() * TAU,
    })),
  };
  const origin = orbitPoint(orbit, 0);
  const dense: Point[] = Array.from({ length: SWIM.dense + 1 }, (_, j) => {
    const [x, y] = orbitPoint(orbit, (j / SWIM.dense) * TAU);
    return [x - origin[0], y - origin[1]];
  });
  const distances = [0];
  for (let j = 1; j <= SWIM.dense; j++) {
    const [x0, y0] = dense[j - 1];
    const [x1, y1] = dense[j];
    distances.push(distances[j - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = distances[SWIM.dense];
  const points: Point[] = [];
  let j = 1;
  for (let i = 0; i < SWIM.samples; i++) {
    const target = (i / SWIM.samples) * total;
    while (distances[j] < target) j++;
    const share = (target - distances[j - 1]) / (distances[j] - distances[j - 1] || 1);
    const [x0, y0] = dense[j - 1];
    const [x1, y1] = dense[j];
    points.push([x0 + (x1 - x0) * share, y0 + (y1 - y0) * share]);
  }
  points[0] = [0, 0];
  const loop = [...points, points[0]];
  const rotations: number[] = [];
  for (let i = 0; i <= SWIM.samples; i++) {
    const [x0, y0] = points[(i - 1 + SWIM.samples) % SWIM.samples];
    const [x1, y1] = points[(i + 1) % SWIM.samples];
    const angle = Math.atan2(y1 - y0, x1 - x0) * DEGREES;
    rotations.push(i === 0 ? angle : unwrap(angle, rotations[i - 1]));
  }
  const times = evenKeyTimes(loop.length);
  const lightTimes = evenKeyTimes(SWIM.lights + 1);
  const step = SWIM.samples / SWIM.lights;
  return {
    duration: Math.max(8, Math.round(total / speed)),
    path: smoothPath(points),
    x: { values: loop.map(([x]) => x), keyTimes: times, easing: LINEAR },
    y: { values: loop.map(([, y]) => y), keyTimes: times, easing: LINEAR },
    rotation: { values: rotations, keyTimes: times, easing: LINEAR },
    lightValues: lightTimes.map((_, k) => formatPoint(worldLight(rotations[k * step]))).join(';'),
    lightKeyTimes: lightTimes.map((t) => +t.toFixed(4)).join(';'),
  };
}
