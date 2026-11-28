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
const SWIM = { densePerLap: 720, pathPerLap: 72, step: 0.4, fine: 0.05, escapeStep: 0.1 } as const;
const LAPS = [2, 3] as const;
const ORBIT_MARGIN = 0.05;
const RADIAL_WAVES = [
  { from: 0.3, to: 0.7, share: 0.45 },
  { from: 1.2, to: 2.4, share: 0.3 },
  { from: 2.6, to: 4.6, share: 0.25 },
] as const;
const ANGULAR_WAVES = [
  { from: 0.4, to: 1, drift: 0.25 },
  { from: 1.5, to: 2.5, drift: 0.2 },
] as const;
const PACE = { min: 0.75, max: 1.3, shares: [0.15, 0.1, 0.05], period: 5, spread: 7 } as const;
const ESCAPE = { back: 0.8, pause: 0.6, ramp: 0.5, distance: 1.3 } as const;
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
  keyTimes: string;
  keyPoints: string;
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

interface Wave {
  q: number;
  a: number;
  phase: number;
}

interface Orbit {
  laps: number;
  sense: number;
  radial: readonly Wave[];
  angular: readonly Wave[];
}

interface SwimTiming {
  duration: number;
  times: number[];
  progress: number[];
}

function waveSum(waves: readonly Wave[], t: number): number {
  return waves.reduce((sum, { q, a, phase }) => sum + a * Math.sin(q * t + phase), 0);
}

function lapOrder(random: () => number, laps: number, from: number, to: number): number {
  const orders: number[] = [];
  for (let k = Math.ceil(from * laps); k <= Math.floor(to * laps); k++) {
    if (k % laps !== 0) orders.push(k);
  }
  const k = orders.length ? orders[Math.floor(random() * orders.length)] : 1;
  return k / laps;
}

function swimOrbit(random: () => number): Orbit {
  const laps = LAPS[Math.floor(random() * LAPS.length)];
  const sense = random() < 0.5 ? -1 : 1;
  const radial = RADIAL_WAVES.map(({ from, to, share }) => ({
    q: lapOrder(random, laps, from, to),
    a: share * (0.6 + 0.4 * random()),
    phase: random() * TAU,
  }));
  const angular = ANGULAR_WAVES.map(({ from, to, drift }) => {
    const q = lapOrder(random, laps, from, to);
    return { q, a: (drift * (0.6 + 0.4 * random())) / q, phase: random() * TAU };
  });
  return { laps, sense, radial, angular };
}

function orbitPoints(orbit: Orbit, { start, inner, outer }: SwimArea): Point[] {
  const count = orbit.laps * SWIM.densePerLap;
  const span = orbit.laps * TAU;
  const waves = Array.from({ length: count + 1 }, (_, j) =>
    waveSum(orbit.radial, (j / count) * span),
  );
  const low = Math.min(...waves);
  const high = Math.max(...waves);
  const margin = (outer - inner) * ORBIT_MARGIN;
  const ring = Math.max(0, outer - inner - 2 * margin);
  const radius = (wave: number): number =>
    inner + margin + (high > low ? ((wave - low) / (high - low)) * ring : ring / 2);
  const target = Math.min(outer - margin, Math.max(inner + margin, Math.hypot(...start)));
  let from = 0;
  let best = Infinity;
  for (let j = 0; j < count; j++) {
    const r0 = radius(waves[j]) - target;
    const r1 = radius(waves[j + 1]) - target;
    if (r0 * r1 <= 0) {
      from = j + (r0 === r1 ? 0 : r0 / (r0 - r1));
      break;
    }
    if (Math.abs(r0) < best) {
      best = Math.abs(r0);
      from = j;
    }
  }
  const t0 = (from / count) * span;
  const angle = (t: number): number => orbit.sense * (t + waveSum(orbit.angular, t));
  const turn = Math.atan2(start[1], start[0]) - angle(t0);
  const at = (t: number): Point => {
    const r = radius(waveSum(orbit.radial, t));
    const a = turn + angle(t);
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  const origin = at(t0);
  return Array.from({ length: count + 1 }, (_, j) => {
    const [x, y] = j === count ? origin : at(t0 + (j / count) * span);
    return [x - origin[0], y - origin[1]];
  });
}

function rampFactor(t: number, from: number, to: number): number {
  const gap = t < from ? from - t : t > to ? t - to : 0;
  return gap >= ESCAPE.ramp ? 1 : 0.5 - 0.5 * Math.cos((Math.PI * gap) / ESCAPE.ramp);
}

function swimTiming(random: () => number, length: number, speed: number): SwimTiming {
  const pace = speed * (PACE.min + random() * (PACE.max - PACE.min));
  const count = random() < 0.5 ? 1 : 2;
  const back = ESCAPE.distance * speed;
  const window = ESCAPE.back + ESCAPE.pause;
  const duration = Math.max(
    8,
    Math.round((length + count * back) / pace + count * (window + ESCAPE.ramp)),
  );
  const latest = duration - window - 2 * ESCAPE.ramp;
  const escapes = Array.from({ length: count }, (_, k) =>
    Math.min(latest, (duration * (k + 0.2 + 0.6 * random())) / count),
  );
  const waves = PACE.shares.map((share) => ({
    share,
    cycles: Math.max(1, Math.round(duration / (PACE.period + PACE.spread * random()))),
    phase: random() * TAU,
  }));
  const forward = (t: number): number =>
    escapes.reduce(
      (value, e) => value * rampFactor(t, e, e + window),
      waves.reduce(
        (value, { share, cycles, phase }) =>
          value + share * Math.sin((TAU * cycles * t) / duration + phase),
        1,
      ),
    );
  const backward = (t: number): number =>
    escapes.reduce((value, e) => {
      if (t < e || t > e + ESCAPE.back) return value;
      return value - ((2 * back) / ESCAPE.back) * Math.sin((Math.PI * (t - e)) / ESCAPE.back) ** 2;
    }, 0);
  const steps = Math.ceil(duration / SWIM.fine);
  const dt = duration / steps;
  const ahead = [0];
  const behind = [0];
  for (let i = 1; i <= steps; i++) {
    const t = (i - 0.5) * dt;
    ahead.push(ahead[i - 1] + forward(t) * dt);
    behind.push(behind[i - 1] + backward(t) * dt);
  }
  const scale = (length - behind[steps]) / ahead[steps];
  const coarse = Math.round(duration / SWIM.step);
  const times = [
    ...Array.from({ length: coarse + 1 }, (_, i) => (i / coarse) * duration),
    ...escapes.flatMap((e) => {
      const from = e - ESCAPE.ramp;
      const dense = Math.round((window + 2 * ESCAPE.ramp) / SWIM.escapeStep);
      return Array.from({ length: dense + 1 }, (_, i) => from + i * SWIM.escapeStep);
    }),
  ]
    .sort((a, b) => a - b)
    .filter((t, i, all) => i === 0 || t - all[i - 1] > 0.02);
  const progress = times.map((t, i) => {
    if (i === 0) return 0;
    if (i === times.length - 1) return length;
    const at = t / dt;
    const k = Math.min(steps - 1, Math.floor(at));
    const share = at - k;
    const value = (j: number): number => scale * ahead[j] + behind[j];
    return Math.min(length, Math.max(0, value(k) + (value(k + 1) - value(k)) * share));
  });
  return { duration, times, progress };
}

export function parameciumSwim(index: number, area: SwimArea): ParameciumSwim {
  const random = lcg(index * 2731 + 11);
  random();
  const dense = orbitPoints(swimOrbit(random), area);
  const distances = [0];
  for (let j = 1; j < dense.length; j++) {
    const [x0, y0] = dense[j - 1];
    const [x1, y1] = dense[j];
    distances.push(distances[j - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = distances[dense.length - 1];
  const segment = (s: number): number => {
    let low = 0;
    let high = dense.length - 2;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (distances[mid] <= s) low = mid;
      else high = mid - 1;
    }
    return low;
  };
  const pointAt = (s: number): Point => {
    const j = segment(s);
    const share = (s - distances[j]) / (distances[j + 1] - distances[j] || 1);
    const [x0, y0] = dense[j];
    const [x1, y1] = dense[j + 1];
    return [x0 + (x1 - x0) * share, y0 + (y1 - y0) * share];
  };
  const headingAt = (s: number): number => {
    const j = segment(s >= total ? 0 : s);
    const [x0, y0] = dense[j];
    const [x1, y1] = dense[j + 1];
    return Math.atan2(y1 - y0, x1 - x0) * DEGREES;
  };
  const lapCount = Math.round((dense.length - 1) / SWIM.densePerLap);
  const pathCount = lapCount * SWIM.pathPerLap;
  const path = Array.from({ length: pathCount }, (_, i) =>
    i === 0 ? ([0, 0] as Point) : pointAt((i / pathCount) * total),
  );
  const timing = swimTiming(random, total, area.speed);
  const spots = timing.progress.map((s, i) =>
    i === 0 || i === timing.progress.length - 1 ? ([0, 0] as Point) : pointAt(s),
  );
  const rotations: number[] = [];
  timing.progress.forEach((s, i) => {
    const angle = headingAt(s);
    rotations.push(i === 0 ? angle : unwrap(angle, rotations[i - 1]));
  });
  const keyTimes = timing.times.map((t) => t / timing.duration);
  const format = (values: readonly number[]): string =>
    values.map((value) => +value.toFixed(5)).join(';');
  return {
    duration: timing.duration,
    path: smoothPath(path),
    x: { values: spots.map(([x]) => x), keyTimes, easing: LINEAR },
    y: { values: spots.map(([, y]) => y), keyTimes, easing: LINEAR },
    rotation: { values: rotations, keyTimes, easing: LINEAR },
    lightValues: rotations.map((rotation) => formatPoint(worldLight(rotation))).join(';'),
    keyTimes: format(keyTimes),
    keyPoints: format(timing.progress.map((s) => s / total)),
  };
}
