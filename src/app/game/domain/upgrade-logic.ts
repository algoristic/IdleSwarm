import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { ChainUpgradePurchase, UpgradeId, UpgradePurchase } from './models/upgrade.model';

export const CHAIN_UPGRADE_COUNT = 4;

const CHAIN_COST_TOLERANCE = 1e-9;

export function upgradeEffect(config: GameConfig, id: UpgradeId, rank: number): number {
  return config.upgrades[id].base * config.upgrades[id].factor ** rank;
}

export function upgradeCost(config: GameConfig, id: UpgradeId, rank: number): number {
  return config.upgrades[id].cost * config.upgrades[id].growth ** rank;
}

export function reachFor(config: GameConfig, flagellaRank: number): number {
  return config.reach.base + config.reach.step * Math.floor(flagellaRank / config.reach.every);
}

export function travelSpeedFor(config: GameConfig, thrust: number): number {
  return config.travel.base * (1 + Math.log10(Math.max(1, thrust / config.travel.reference)));
}

export function chainUpgradeCost(config: GameConfig, rank: number): number {
  return Math.ceil(
    config.chainUpgrade.baseCost * config.chainUpgrade.costGrowth ** rank - CHAIN_COST_TOLERANCE,
  );
}

export function chainUpgradeFactor(config: GameConfig, rank: number): number {
  return 1 + config.chainUpgrade.effectPerRank * rank;
}

export function isChainUpgradeLocked(
  state: Pick<GameState, 'chainRanks' | 'units'>,
  index: number,
): boolean {
  return state.chainRanks[index] === 0 && state.units[index + 1] < 1;
}

export function buyUpgrade(config: GameConfig, state: GameState, id: UpgradeId): UpgradePurchase {
  const rank = state.upgradeRanks[id];
  if (state.freeUpgrades > 0) {
    state.freeUpgrades--;
    state.upgradeRanks[id]++;
    return 'free';
  }
  const cost = upgradeCost(config, id, rank);
  if (state.food < cost) return 'unaffordable';
  state.food -= cost;
  state.upgradeRanks[id]++;
  return 'paid';
}

export function buyChainUpgrade(
  config: GameConfig,
  state: GameState,
  index: number,
): ChainUpgradePurchase {
  if (!config.chainUpgrade.enabled) return 'disabled';
  const cost = chainUpgradeCost(config, state.chainRanks[index]);
  if (state.units[index + 1] < cost) return 'unaffordable';
  state.units[index + 1] -= cost;
  state.chainRanks[index]++;
  return 'paid';
}
