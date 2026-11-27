import { UNIT_IDS } from '@app/game/domain/models/unit.model';
import { UPGRADE_IDS, UpgradeId } from '@app/game/domain/models/upgrade.model';
import {
  CHAIN_KEYS,
  ChainKey,
  ChainNeuronView,
  ChainNodeView,
  SwarmNeuronView,
  UpgradeCostView,
  UpgradeNodeView,
} from '@app/game/ui/neuron/neuron.model';

import { CatalogChoice } from '../../domain/data/catalog.data';

const FOOD_COSTS: Readonly<Record<UpgradeId, number>> = {
  hearth: 120,
  digestion: 4500,
  flagella: 1.2e6,
  crop: 3.4e7,
};

const CHAIN_COST_AMOUNTS: Readonly<Record<ChainKey, number>> = {
  eater: 1,
  brooder: 3,
  eggBearer: 25,
  clutch: 1200,
};

function upgradeCost(id: UpgradeId, state: CatalogChoice<'upgradeState'>): UpgradeCostView {
  return id === 'crop' && state !== 'poor'
    ? { kind: 'free' }
    : { kind: 'food', amount: FOOD_COSTS[id] };
}

export function sampleSwarmNeuronView(
  rank: number,
  state: CatalogChoice<'upgradeState'>,
): SwarmNeuronView {
  const nodes = Object.fromEntries(
    UPGRADE_IDS.map((id): [UpgradeId, UpgradeNodeView] => [
      id,
      { rank, affordable: state !== 'poor', cost: upgradeCost(id, state) },
    ]),
  ) as Record<UpgradeId, UpgradeNodeView>;
  return { nodes, selected: state === 'selected' ? 'hearth' : null };
}

export function sampleChainNodeView(
  key: ChainKey,
  rank: number,
  state: CatalogChoice<'chainState'>,
): ChainNodeView {
  const next = UNIT_IDS[UNIT_IDS.indexOf(key) + 1];
  const locked = state === 'locked';
  return {
    rank,
    affordable: state === 'affordable' || state === 'selected',
    locked,
    cost: locked
      ? { kind: 'lockedUntil', unit: next }
      : { kind: 'units', unit: next, amount: CHAIN_COST_AMOUNTS[key] },
  };
}

export function sampleChainNeuronView(
  rank: number,
  state: CatalogChoice<'chainState'>,
): ChainNeuronView {
  const nodes = Object.fromEntries(
    CHAIN_KEYS.map((key): [ChainKey, ChainNodeView] => [
      key,
      sampleChainNodeView(key, rank, state),
    ]),
  ) as Record<ChainKey, ChainNodeView>;
  return { nodes, selected: state === 'selected' ? 'eater' : null };
}
