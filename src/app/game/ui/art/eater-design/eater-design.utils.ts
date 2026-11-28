import {
  formatCoord,
  formatPoint,
  loopFrames,
  Point,
  smoothPath,
  wavePath,
  WaveOptions,
} from '../path.utils';
import { blobPath, lcg } from '../shape.utils';
import { Cycling, Placed, Ray } from './eater-design.model';

function scatter(
  seed: number,
  count: number,
  inside: (point: Point) => boolean,
  box: Point,
  radius: Point,
): Placed[] {
  const random = lcg(seed);
  const placed: Placed[] = [];
  while (placed.length < count) {
    const point: Point = [(random() * 2 - 1) * box[0], (random() * 2 - 1) * box[1]];
    const r = radius[0] + random() * (radius[1] - radius[0]);
    if (inside(point)) placed.push({ transform: `translate(${formatPoint(point)})`, r });
  }
  return placed;
}

const BACILLUS_BODY = 'M-1.6 -3.3H6.3A3.3 3.3 0 0 1 6.3 3.3H-1.6A3.3 3.3 0 0 1 -1.6 -3.3Z';
const BACILLUS_FLAGELLA = [-1.6, 0, 1.6].map((y, i): WaveOptions => ({
  start: [-4.4, y * 1.1],
  angle: Math.PI + y * 0.09,
  length: 7.4 - Math.abs(y) * 0.5,
  amplitude: 1.15,
  wavelength: 3.6 + i * 0.25,
  steps: 18,
}));
const bacillusFlagella = (phase: number): string =>
  BACILLUS_FLAGELLA.map((options, i) => wavePath(options, phase + i * 0.9)).join('');

export const BACILLUS = {
  body: BACILLUS_BODY,
  flagella: bacillusFlagella(0),
  flagellaFrames: loopFrames(8, bacillusFlagella),
  nucleoid: blobPath(2.1, 17, 9, 0.3, 2.6, 0.1),
  strand: smoothPath(
    [
      [0.4, 0.6],
      [1.4, -1.3],
      [2.6, 0.9],
      [3.6, -1],
      [4.8, 0.4],
    ],
    false,
  ),
  ribosomes: scatter(
    41,
    9,
    ([x, y]) => Math.abs(y) < 2.4 && x > -3.6 && x < 8.8 && Math.hypot(x - 2.6, y) > 2.6,
    [8.8, 2.4],
    [0.28, 0.42],
  ),
};

const DINOFLAGELLATE_OUTLINE: readonly Point[] = [
  [9.6, 0],
  [6.6, -3.3],
  [2.6, -5.6],
  [-0.8, -6.1],
  [-4.4, -5.5],
  [-7.4, -3.7],
  [-8.7, -0.6],
  [-8.2, 2.6],
  [-6.6, 4.6],
  [-3.6, 5.8],
  [-0.4, 6.1],
  [3, 5.4],
  [6.8, 3.2],
];
const DINO_STRIPE_PERIOD = 4;
const plates = (x0: number, x1: number, skew: number): string =>
  Array.from({ length: 9 }, (_, i) => {
    const y = -18 + i * DINO_STRIPE_PERIOD;
    const h = DINO_STRIPE_PERIOD / 2;
    return `M${formatPoint([x0, y])}L${formatPoint([x1, y + skew])}L${formatPoint([x1, y + skew + h])}L${formatPoint([x0, y + h])}Z`;
  }).join('');
const DINO_RING: WaveOptions = {
  start: [-0.2, -6.4],
  angle: Math.PI / 2,
  length: 12.8,
  amplitude: 0.55,
  wavelength: 2.1,
  bend: 1.6,
  steps: 24,
};
const DINO_TAIL: WaveOptions = {
  start: [-3.2, 1.6],
  angle: Math.PI - 0.12,
  length: 8.4,
  amplitude: 1.4,
  wavelength: 5.2,
  steps: 18,
};

export const DINOFLAGELLATE = {
  body: smoothPath(DINOFLAGELLATE_OUTLINE),
  horns: 'M-7 -3.4L-10.6 -5.3L-8.6 -1.4ZM-6.8 3.8L-10.2 4.6L-8.1 1.6ZM8.6 -1L11.2 0L8.6 1Z',
  epicone: plates(0.6, 11, -2.6),
  hypocone: plates(-11, -0.6, 2.4),
  stripeShift: `0 0;0 ${DINO_STRIPE_PERIOD}`,
  groove: 'M-.2 -6.4Q3 0 -.2 6.4',
  sulcus: 'M-.6 1.2Q-2.4 2 -4.4 1.7',
  ring: wavePath(DINO_RING, 0),
  ringFrames: loopFrames(8, (phase) => wavePath(DINO_RING, phase)),
  tail: wavePath(DINO_TAIL, 0),
  tailFrames: loopFrames(8, (phase) => wavePath(DINO_TAIL, phase)),
};

const HELIOZOAN_RAYS = 18;

function heliozoanRays(): Ray[] {
  const random = lcg(73);
  return Array.from({ length: HELIOZOAN_RAYS }, (_, key) => {
    const angle = (key / HELIOZOAN_RAYS) * 360 + (random() - 0.5) * 8;
    const length = 10.2 + random() * 1.4;
    const granuleRest = 6 + random() * 3;
    return {
      key,
      transform: `rotate(${formatCoord(angle)})`,
      length,
      values: [length, length - 1.6, length + 0.4, length].map(formatCoord).join(';'),
      dur: `${formatCoord(2.6 + random() * 1.4)}s`,
      delay: random() * 3,
      granule: key % 2 === 0,
      granuleValues: `5;${formatCoord(length - 0.4)}`,
      granuleRest,
      granuleDur: `${formatCoord(3 + random() * 1.6)}s`,
    };
  });
}

export const HELIOZOAN = {
  body: blobPath(4.9, 31, 11, 0.07),
  rays: heliozoanRays(),
  bubbles: scatter(57, 8, ([x, y]) => Math.hypot(x, y) < 3.3, [3.3, 3.3], [0.55, 1.05]),
  core: blobPath(1.5, 5, 7, 0.15),
};

const DIATOM_BODY =
  'M10.6 0C9.8 -.9 8.6 -1.5 7.4 -2C3.6 -3.4 -3.6 -3.4 -7.4 -2C-8.6 -1.5 -9.8 -.9 -10.6 0C-9.8 .9 -8.6 1.5 -7.4 2C-3.6 3.4 3.6 3.4 7.4 2C8.6 1.5 9.8 .9 10.6 0Z';

function diatomStriae(halfLength: number, step: number, inner: number): string {
  const count = Math.floor((2 * halfLength) / step);
  return Array.from({ length: count + 1 }, (_, i) => {
    const x = -halfLength + i * step;
    const slant = (x / halfLength) * 0.5;
    return `M${formatPoint([x, -inner])}L${formatPoint([x + slant, -4])}M${formatPoint([x, inner])}L${formatPoint([x + slant, 4])}`;
  }).join('');
}

export const DIATOM = {
  body: DIATOM_BODY,
  striae: diatomStriae(9.6, 0.8, 0.75),
  raphe: 'M-9 0H-.9M.9 0H9',
  nodules: [-9.2, 0, 9.2],
  chloroplasts: [
    'M-6.6 -1.4C-3.6 -2.5 3.6 -2.5 6.6 -1.4C3.6 -.8 -3.6 -.8 -6.6 -1.4Z',
    'M-6.6 1.4C-3.6 2.5 3.6 2.5 6.6 1.4C3.6 .8 -3.6 .8 -6.6 1.4Z',
  ],
  sheen: 'M-1.2 -4.2H1.4L-.6 4.2H-3.2Z',
};

const STENTOR_OUTLINE: readonly Point[] = [
  [-11.2, 0],
  [-9.6, -1],
  [-5.6, -2],
  [-0.6, -3.6],
  [4.2, -5.6],
  [7.4, -6.3],
  [8.8, -3.4],
  [9.2, 0],
  [8.8, 3.4],
  [7.4, 6.3],
  [4.2, 5.6],
  [-0.6, 3.6],
  [-5.6, 2],
  [-9.6, 1],
];

export const STENTOR = {
  body: smoothPath(STENTOR_OUTLINE),
  stripes: [-0.75, -0.45, -0.15, 0.15, 0.45, 0.75]
    .map((k) =>
      smoothPath(
        [
          [-10, k * 0.7],
          [-1, k * 3.6],
          [8.4, k * 7],
        ],
        false,
      ),
    )
    .join(''),
  beads: [
    [-6.2, 0.4],
    [-4.4, 0.9],
    [-2.6, 1.1],
    [-0.8, 0.9],
    [1, 0.5],
    [2.8, 0.4],
  ].map(([x, y], i) => ({ key: i, cx: x, cy: y, r: 0.75 + (i % 2) * 0.15 })),
  chain: 'M-6.2 .4C-4.4 1 -2.6 1.3 -.8 .9S2 .3 2.8 .4',
  contraction: '1 1;1 1;.8 1.14;1 1',
  contractionTimes: '0;.5;.58;1',
};

const SPIRAL_SEGMENTS = 13;
const SPIRAL_CENTER: Point = [-3, -1];
const SPIRAL_STEP = 0.48;
const spiralDistance = (key: number): number => 1.17 ** key;
const spiralRadius = (key: number): number => 0.55 * 1.15 ** key;

function spiralSegments(): Cycling[] {
  return Array.from({ length: SPIRAL_SEGMENTS }, (_, key) => {
    const angle = (SPIRAL_SEGMENTS - 1 - key) * SPIRAL_STEP;
    const position: Point = [
      SPIRAL_CENTER[0] + Math.cos(angle) * spiralDistance(key),
      SPIRAL_CENTER[1] + Math.sin(angle) * spiralDistance(key),
    ];
    return {
      key,
      transform: `translate(${formatPoint(position)})`,
      r: spiralRadius(key),
      delay: (SPIRAL_SEGMENTS - 1 - key) * 0.16,
    };
  });
}

const LAST_SEGMENT = SPIRAL_SEGMENTS - 1;
const SPIRAL_MOUTH: Point = [
  SPIRAL_CENTER[0] + spiralDistance(LAST_SEGMENT) + spiralRadius(LAST_SEGMENT) * 0.55,
  SPIRAL_CENTER[1],
];
const SPIRAL_FILAMENTS: readonly WaveOptions[] = Array.from({ length: 9 }, (_, i) => {
  const spread = (i / 8 - 0.5) * 2.5;
  return {
    start: [SPIRAL_MOUTH[0] + Math.cos(spread) * 1.2, SPIRAL_MOUTH[1] + Math.sin(spread) * 2],
    angle: spread * 0.9,
    length: 4 - Math.abs(spread) * 0.5,
    amplitude: 0.45,
    wavelength: 3.2,
    steps: 10,
  };
});
const spiralCrown = (phase: number): string =>
  SPIRAL_FILAMENTS.map((options, i) => wavePath(options, phase + i * 0.7)).join('');

export const SPIRAL = {
  segments: spiralSegments(),
  crown: spiralCrown(0),
  crownFrames: loopFrames(8, spiralCrown),
  particles: [-1.2, 0.2, 1.3].map((dy, key) => ({
    key,
    path: `M${formatPoint([11.6, SPIRAL_MOUTH[1] + dy * 2.4])}L${formatPoint([SPIRAL_MOUTH[0] + 0.6, SPIRAL_MOUTH[1] + dy * 0.2])}`,
    rest: `translate(${formatPoint([9.6 - key * 0.6, SPIRAL_MOUTH[1] + dy * 1.8])})`,
    delay: key * 0.9,
  })),
};

const PRISM_CORNERS: readonly Point[] = [
  [10, 0],
  [4.6, -4],
  [-0.8, -5.6],
  [-6.2, -4],
  [-8.6, 0],
  [-6.2, 4],
  [-0.8, 5.6],
  [4.6, 4],
];
const PRISM_TONES = [
  [1, 2],
  [0, 3],
  [4, 7],
  [5, 6],
] as const;
const prismApex = (phase: number): Point => [0.6 + 1.9 * Math.cos(phase), 1.4 * Math.sin(phase)];
const prismFacets =
  (facets: readonly number[]) =>
  (phase: number): string => {
    const apex = formatPoint(prismApex(phase));
    return facets
      .map((i) => {
        const next = PRISM_CORNERS[(i + 1) % PRISM_CORNERS.length];
        return `M${apex}L${formatPoint(PRISM_CORNERS[i])}L${formatPoint(next)}Z`;
      })
      .join('');
  };
const prismEdges = (phase: number): string => {
  const apex = formatPoint(prismApex(phase));
  return PRISM_CORNERS.map((corner) => `M${apex}L${formatPoint(corner)}`).join('');
};

export const PRISM = {
  body: `M${PRISM_CORNERS.map(formatPoint).join('L')}Z`,
  tones: PRISM_TONES.map((facets, key) => ({
    key,
    d: prismFacets(facets)(0),
    frames: loopFrames(8, prismFacets(facets)),
  })),
  edges: prismEdges(0),
  edgeFrames: loopFrames(8, prismEdges),
  shard: 'M.9 0L-.5 -.6L-.4 .7Z',
  shards: [-2.6, -0.8, 1, 2.8].map((y, key) => ({
    key,
    path: `M${formatPoint([-8.4, y * 0.6])}L${formatPoint([-11.6, y * 1.25])}`,
    rest: `translate(${formatPoint([-10 - (key % 2) * 0.8, y])})`,
    scale: [0.9, 0.7, 1, 0.6][key],
    delay: key * 0.7,
  })),
};
