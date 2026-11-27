import { DerivedValues } from './models/derived-values.model';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { availableFood, currentSite } from './site-logic';

export function harvestHistoryLength(config: GameConfig): number {
  return Math.round(config.finds.averageWindow / config.dt);
}

export function addFood(state: Pick<GameState, 'food'>, amount: number, capacity: number): void {
  if (amount <= 0) return;
  const added = Math.min(amount, Math.max(0, capacity - state.food));
  state.food += added;
  const rest = amount - added;
  if (rest > 0) state.food = Math.sqrt(state.food * state.food + 2 * capacity * rest);
}

export function averageHarvest(
  config: GameConfig,
  state: Pick<GameState, 'time' | 'harvestHistorySum'>,
): number {
  const span = Math.min(config.finds.averageWindow, state.time);
  return span > 0 ? state.harvestHistorySum / span : 0;
}

export function harvest(
  config: GameConfig,
  state: GameState,
  derived: Pick<DerivedValues, 'appetite' | 'capacity'>,
): number {
  const dt = config.dt;
  let rate = 0;
  const site = currentSite(state);
  if (site && !site.dead) {
    const before = state.food;
    addFood(state, derived.appetite * dt, derived.capacity);
    let eaten = state.food - before;
    if (eaten > availableFood(config, site)) {
      eaten = availableFood(config, site);
      state.food = before + eaten;
    }
    site.stock -= eaten;
    rate = eaten / dt;
  }
  state.lastHarvestRate = rate;
  state.harvestHistorySum += rate * dt - state.harvestHistory[state.harvestHistoryIndex];
  state.harvestHistory[state.harvestHistoryIndex] = rate * dt;
  state.harvestHistoryIndex = (state.harvestHistoryIndex + 1) % harvestHistoryLength(config);
  state.stats.totalHarvest += rate * dt;
  state.stats.timeByZone[state.zone] += dt;
  if (rate <= 0) {
    state.stats.idleTime += dt;
    state.stats.idleTimeByZone[state.zone] += dt;
  }
  return rate;
}
