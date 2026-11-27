import { DerivedValues } from './models/derived-values.model';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { BuyMode } from './models/unit.model';
import { CHAIN_UPGRADE_COUNT, chainUpgradeFactor } from './upgrade-logic';

const FIRST_UNLOCKABLE_UNIT = 2;
const QUARTER_SHARE = 0.25;

export function productionOf(
  config: GameConfig,
  state: Pick<GameState, 'chainRanks'>,
  unit: number,
): number {
  return (
    config.units[unit].production *
    (config.chainUpgrade.enabled && unit - 1 < CHAIN_UPGRADE_COUNT
      ? chainUpgradeFactor(config, state.chainRanks[unit - 1])
      : 1)
  );
}

export function produce(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'eggRate' | 'chainMultiplier'>,
): void {
  const dt = config.dt;
  state.eggs += derived.eggRate * dt;
  const units = state.units.slice();
  for (let k = 1; k < config.units.length; k++)
    state.units[k - 1] += units[k] * productionOf(config, state, k) * derived.chainMultiplier * dt;
  for (let k = FIRST_UNLOCKABLE_UNIT; k < config.units.length; k++)
    if (state.units[k - 1] >= 1) state.unlocked[k] = true;
}

export function maxBuy(config: GameConfig, state: GameState, unit: number): number {
  const unitConfig = config.units[unit];
  let max = Math.min(Math.floor(state.food / unitConfig.cost), Math.floor(state.eggs));
  if (unit > 0) max = Math.min(max, Math.floor(state.units[unit - 1] / unitConfig.requirement));
  return Math.max(0, max);
}

export function buyAmount(
  config: GameConfig,
  state: GameState,
  unit: number,
  mode: BuyMode,
): number {
  const max = maxBuy(config, state, unit);
  if (max < 1) return 0;
  if (mode === 'one') return 1;
  if (mode === 'quarter') return Math.max(1, Math.floor(max * QUARTER_SHARE));
  return max;
}

export function buyUnit(
  config: GameConfig,
  state: GameState,
  unit: number,
  count: number,
): boolean {
  if (count < 1 || count > maxBuy(config, state, unit) || !state.unlocked[unit]) return false;
  const unitConfig = config.units[unit];
  state.food -= unitConfig.cost * count;
  state.eggs -= count;
  if (unit > 0) state.units[unit - 1] -= unitConfig.requirement * count;
  state.units[unit] += count;
  return true;
}
