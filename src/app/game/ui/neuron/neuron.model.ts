import { UnitId } from '../../domain/models/unit.model';
import { UpgradeId } from '../../domain/models/upgrade.model';
import { ChainIconUnit } from '../art/unit-sprite/unit-sprite.model';

export const CHAIN_KEYS = [
  'eater',
  'brooder',
  'eggBearer',
  'clutch',
] as const satisfies readonly ChainIconUnit[];
export type ChainKey = (typeof CHAIN_KEYS)[number];

export const SWARM_DENDRITE_IDS = ['hearth', 'digestion', 'crop'] as const satisfies UpgradeId[];
export type SwarmDendriteId = (typeof SWARM_DENDRITE_IDS)[number];

export type NeuronSelection = UpgradeId | ChainKey | null;

export type NeuronTone = 'swarm' | 'chain';

export type NeuronLabelAlign = 'middle' | 'start';

export type UpgradeCostView =
  | { kind: 'free' }
  | { kind: 'food'; amount: number }
  | { kind: 'units'; unit: UnitId; amount: number }
  | { kind: 'lockedUntil'; unit: UnitId };

export interface UpgradeNodeView {
  rank: number;
  affordable: boolean;
  cost: UpgradeCostView;
}

export interface ChainNodeView extends UpgradeNodeView {
  locked: boolean;
}

export interface SwarmNeuronView {
  nodes: Readonly<Record<UpgradeId, UpgradeNodeView>>;
  selected: NeuronSelection;
}

export interface ChainNeuronView {
  nodes: Readonly<Record<ChainKey, ChainNodeView>>;
  selected: NeuronSelection;
}

export type NeuronPoint = readonly [number, number];

export interface DendriteGeometry {
  p0: NeuronPoint;
  c: NeuronPoint;
  p1: NeuronPoint;
  label: NeuronPoint;
}

export interface BeadView {
  cx: string;
  cy: string;
  next: boolean;
}

export type MyelinState = 'off' | 'on' | 'next';

export interface MyelinView {
  y: number;
  state: MyelinState;
}

export interface ReachMilestoneView {
  y: number;
  rank: number;
  reach: number;
  reached: boolean;
}

export interface OrganelleView {
  transform: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
  midX: number;
  midY: number;
  midWidth: number;
  midHeight: number;
  midRx: number;
  wave: string;
}

export interface SpeckView {
  cx: string;
  cy: string;
  r: string;
}

export interface NeuronOrganellesView {
  organelles: OrganelleView[];
  specks: SpeckView[];
}
