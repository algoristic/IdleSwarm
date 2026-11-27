import { GameConfig } from './models/game-config.model';
import { UpgradeId } from './models/upgrade.model';

export function upgradeEffect(config: GameConfig, id: UpgradeId, rank: number): number {
  return config.upgrades[id].base * config.upgrades[id].factor ** rank;
}

export function reachFor(config: GameConfig, flagellaRank: number): number {
  return config.reach.base + config.reach.step * Math.floor(flagellaRank / config.reach.every);
}
