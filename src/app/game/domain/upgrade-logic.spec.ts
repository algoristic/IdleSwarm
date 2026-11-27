import { DEFAULT_GAME_CONFIG } from './data/game-config.data';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { newGame } from './new-game-logic';
import {
  affordableUpgradeCount,
  canAffordChainUpgrade,
  canAffordUpgrade,
  upgradeCount,
} from './upgrade-logic';

const upgrades: GameConfig['upgrades'] = {
  hearth: { base: 1, factor: 1.7, cost: 30, growth: 3 },
  digestion: { base: 1, factor: 1.5, cost: 300, growth: 5 },
  flagella: { base: 50, factor: 1.8, cost: 1000, growth: 2.05 },
  crop: { base: 2000, factor: 1.5, cost: 80, growth: 2.2 },
};

function configWith(enabled: boolean, baseCost = 1): GameConfig {
  return {
    ...DEFAULT_GAME_CONFIG,
    upgrades,
    chainUpgrade: { enabled, effectPerRank: 1, baseCost, costGrowth: 2 },
  };
}

function stateWith(config: GameConfig, fields: Partial<GameState>): GameState {
  return { ...newGame(config, 1, 0), ...fields };
}

describe('canAffordUpgrade', () => {
  const config = configWith(false);

  it('compares the food with the cost of the next rank', () => {
    const ranks = { hearth: 1, digestion: 0, flagella: 0, crop: 0 };
    expect(
      canAffordUpgrade(config, stateWith(config, { food: 89, upgradeRanks: ranks }), 'hearth'),
    ).toBe(false);
    expect(
      canAffordUpgrade(config, stateWith(config, { food: 90, upgradeRanks: ranks }), 'hearth'),
    ).toBe(true);
  });

  it('is affordable with a free upgrade even without food', () => {
    const state = stateWith(config, { food: 0, freeUpgrades: 1 });
    expect(canAffordUpgrade(config, state, 'flagella')).toBe(true);
  });
});

describe('canAffordChainUpgrade', () => {
  it('compares the producing unit with the cost of the next rank', () => {
    const config = configWith(true);
    const ranks = [0, 2, 0, 0];
    expect(
      canAffordChainUpgrade(
        config,
        stateWith(config, { chainRanks: ranks, units: [5, 0, 3, 0, 0, 0] }),
        1,
      ),
    ).toBe(false);
    expect(
      canAffordChainUpgrade(
        config,
        stateWith(config, { chainRanks: ranks, units: [5, 0, 4, 0, 0, 0] }),
        1,
      ),
    ).toBe(true);
  });

  it('is not affordable while the upgrade is locked', () => {
    const config = configWith(true, 0);
    const ranks = [0, 0, 0, 0];
    expect(
      canAffordChainUpgrade(
        config,
        stateWith(config, { chainRanks: ranks, units: [5, 0.5, 0, 0, 0, 0] }),
        0,
      ),
    ).toBe(false);
    expect(
      canAffordChainUpgrade(
        config,
        stateWith(config, { chainRanks: ranks, units: [5, 1, 0, 0, 0, 0] }),
        0,
      ),
    ).toBe(true);
  });
});

describe('upgradeCount and affordableUpgradeCount', () => {
  const units = [5, 1, 0, 0, 0, 0];

  it('counts only the swarm upgrades while chain upgrades are disabled', () => {
    const config = configWith(false);
    const state = stateWith(config, { food: 100, units });
    expect(upgradeCount(config)).toBe(4);
    expect(affordableUpgradeCount(config, state)).toBe(2);
  });

  it('adds the chain upgrades when they are enabled', () => {
    const config = configWith(true);
    expect(upgradeCount(config)).toBe(8);
    expect(affordableUpgradeCount(config, stateWith(config, { food: 100, units }))).toBe(3);
    expect(
      affordableUpgradeCount(config, stateWith(config, { food: 0, units, freeUpgrades: 1 })),
    ).toBe(5);
  });
});
