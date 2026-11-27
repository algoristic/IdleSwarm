import { GameConfig } from '../../domain/models/game-config.model';
import { reachFor } from '../../domain/upgrade-logic';
import { lcg } from '../art/shape.utils';
import {
  BeadView,
  ChainKey,
  DendriteGeometry,
  MyelinView,
  NeuronOrganellesView,
  NeuronPoint,
  OrganelleView,
  ReachMilestoneView,
  SpeckView,
  SwarmDendriteId,
} from './neuron.model';

export const NEURON_VIEW_BOX = '-500 -560 1700 1400';
export const CHAIN_NEURON_X = 380;
export const SOMA_PATH =
  'M38.1 -8C37.2 0.5 36.2 7.8 32.3 15.5C28.4 23.1 22.7 34.4 14.9 37.9C7.1 41.4 -6.1 39.9 -14.5 36.6C-22.9 33.2 -30.5 25.2 -35.5 17.8C-40.5 10.4 -45.3 0.1 -44.7 -8C-44 -16.1 -36.8 -24 -31.6 -31C-26.5 -38 -21.5 -45.7 -13.6 -50C-5.7 -54.2 7.3 -59.1 15.8 -56.7C24.4 -54.3 34.1 -43.6 37.8 -35.5C41.5 -27.3 39 -16.5 38.1 -8Z';

const KX = CHAIN_NEURON_X;

export const SWARM_DENDRITES: Readonly<Record<SwarmDendriteId, DendriteGeometry>> = {
  hearth: { p0: [-26, -40], c: [-96, -62], p1: [-118, -138], label: [-118, -182] },
  digestion: { p0: [4, -54], c: [-14, -100], p1: [12, -150], label: [12, -194] },
  crop: { p0: [32, -20], c: [84, -6], p1: [118, -44], label: [118, 0] },
};

export const CHAIN_DENDRITES: Readonly<Record<ChainKey, DendriteGeometry>> = {
  eater: { p0: [KX - 22, -44], c: [KX - 70, -84], p1: [KX - 104, -150], label: [KX - 104, -194] },
  brooder: { p0: [KX + 22, -44], c: [KX + 70, -84], p1: [KX + 104, -150], label: [KX + 104, -194] },
  eggBearer: { p0: [KX - 22, 28], c: [KX - 70, 76], p1: [KX - 104, 140], label: [KX - 104, 184] },
  clutch: { p0: [KX + 22, 28], c: [KX + 70, 76], p1: [KX + 104, 140], label: [KX + 104, 184] },
};

export const FLAGELLA_NODE: NeuronPoint = [0, 218];
export const SWARM_AXON_PATH = 'M0 32V196';
export const CHAIN_AXON_PATH = `M${KX - 56} 2Q200 62 82 42`;
export const TERMINAL_TWIG_PATH = 'M0 196Q-18 214-34 222M0 196Q18 216 30 230';
export const BACKDROP_TWIG_PATHS = [
  'M-70 -78Q-150 -70 -200 -40',
  'M-110 -118Q-170 -150 -190 -205',
  'M8 -120Q60 -170 70 -230',
  'M120 -110Q170 -150 205 -190',
] as const;

const MYELIN_Y = [42, 62, 82, 114, 134, 154] as const;
const RANVIER_Y = [105.5, 177.5] as const;
const ORGANELLE_SPOTS = [
  [-150, -260, 46],
  [170, -300, 34],
  [-180, 200, 52],
  [160, 140, 40],
  [-60, 330, 60],
  [200, 330, 30],
  [-210, -60, 26],
  [210, -40, 28],
  [40, 560, 44],
  [-190, 520, 34],
  [190, 640, 50],
] as const;

function quadraticPoint(
  p0: NeuronPoint,
  c: NeuronPoint,
  p1: NeuronPoint,
  t: number,
): [number, number] {
  return [
    (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * c[0] + t * t * p1[0],
    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * c[1] + t * t * p1[1],
  ];
}

export function dendritePath(d: DendriteGeometry): string {
  return `M${d.p0.join(',')}Q${d.c.join(',')} ${d.p1.join(',')}`;
}

export function beadPositions(d: DendriteGeometry, rank: number): BeadView[] {
  const shown = Math.min(rank, 5);
  const beads: BeadView[] = [];
  for (let i = 0; i <= shown; i++) {
    const [x, y] = quadraticPoint(d.p0, d.c, d.p1, 0.22 + (i / 6) * 0.66);
    beads.push({ cx: x.toFixed(1), cy: y.toFixed(1), next: i === shown });
  }
  return beads;
}

function milestoneBase(rank: number, every: number): number {
  return Math.max(0, (Math.floor(rank / every) - 1) * every);
}

export function myelinStates(rank: number, every: number): MyelinView[] {
  const base = milestoneBase(rank, every);
  return MYELIN_Y.map((y, j) => {
    const segmentRank = base + j + 1;
    return {
      y,
      state: segmentRank <= rank ? 'on' : segmentRank === rank + 1 ? 'next' : 'off',
    };
  });
}

export function reachMilestones(config: GameConfig, rank: number): ReachMilestoneView[] {
  const every = config.reach.every;
  const base = milestoneBase(rank, every);
  return RANVIER_Y.map((y, i) => {
    const milestone = base + every * (i + 1);
    return { y, rank: milestone, reach: reachFor(config, milestone), reached: rank >= milestone };
  });
}

export function neuronOrganelles(showChain: boolean): NeuronOrganellesView {
  const random = lcg(99);
  const dx = (showChain ? KX : 0) / 2;
  const organelles: OrganelleView[] = ORGANELLE_SPOTS.map(([x, y, w]) => {
    const hh = w / 2;
    const angle = Math.round(random() * 180 - 90);
    let wave = `M${-w * 0.7} 0`;
    for (let i = 0; i < 4; i++) {
      wave += `q${(w * 0.17).toFixed(1)} ${(-w * 0.3).toFixed(1)} ${(w * 0.35).toFixed(1)} 0`;
    }
    return {
      transform: `translate(${x + dx} ${y}) rotate(${angle})`,
      x: -w,
      y: -hh,
      width: w * 2,
      height: w,
      rx: hh,
      midX: -w + 5,
      midY: -hh + 5,
      midWidth: w * 2 - 10,
      midHeight: w - 10,
      midRx: hh - 5,
      wave,
    };
  });
  const specks: SpeckView[] = [];
  for (let i = 0; i < 60; i++) {
    specks.push({
      cx: ((random() - 0.5) * 1400 + dx).toFixed(0),
      cy: ((random() - 0.5) * 1200).toFixed(0),
      r: (2.4 + random() * 5.5).toFixed(1),
    });
  }
  return { organelles, specks };
}
