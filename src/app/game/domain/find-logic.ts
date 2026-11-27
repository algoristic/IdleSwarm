import { productionOf } from './chain-logic';
import { averageHarvest } from './harvest-logic';
import { DerivedValues } from './models/derived-values.model';
import { Find, FIND_IDS } from './models/find.model';
import { GameConfig } from './models/game-config.model';
import { GameEventHandler } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { nextRandom, pickWeighted } from './rng-logic';
import { isZoneInRange, placeInDisc } from './site-logic';

export function createFind(config: GameConfig, state: GameState, zone: number): Find {
  const point = placeInDisc(config, state, zone, 0, 0, config.map.zoneRadius);
  return {
    id: state.nextId++,
    type: pickWeighted(state, config.finds.weights, FIND_IDS),
    zone,
    x: point.x,
    y: point.y,
  };
}

export function getFind(state: Pick<GameState, 'finds'>, id: number): Find | null {
  return state.finds.find((find) => find.id === id) ?? null;
}

export function isFindTargetable(
  config: GameConfig,
  state: Pick<GameState, 'zone'>,
  find: Find | null,
  thrust: number,
): find is Find {
  return (
    find !== null && isZoneInRange(state, find.zone) && thrust >= config.zones[find.zone].threshold
  );
}

export function applyFind(
  config: GameConfig,
  state: GameState,
  find: Find,
  derived: Pick<DerivedValues, 'eggRate'>,
  onEvent?: GameEventHandler,
): void {
  const finds = config.finds;
  switch (find.type) {
    case 'feedingFrenzy':
    case 'layingBoost':
    case 'breedingFrenzy':
    case 'tailwind':
      state.buffs[find.type] += finds.buffDuration;
      break;
    case 'foodBubble':
      state.food += Math.max(
        finds.foodBubbleMin,
        finds.foodBubbleSeconds * averageHarvest(config, state),
      );
      break;
    case 'eggBall':
      state.eggs += Math.max(finds.eggBallMin, finds.eggBallSeconds * derived.eggRate);
      break;
    case 'growthSpurt': {
      const units = state.units.slice();
      for (let k = 0; k < config.units.length - 1; k++)
        state.units[k] +=
          finds.growthSpurtSeconds * units[k + 1] * productionOf(config, state, k + 1);
      break;
    }
    case 'germCell':
      state.freeUpgrades++;
      break;
  }
  state.stats.collectedFinds++;
  onEvent?.({ type: 'findCollected', findId: find.id, findType: find.type });
}

export function collectFind(
  config: GameConfig,
  state: GameState,
  find: Find,
  derived: Pick<DerivedValues, 'eggRate'>,
  onEvent?: GameEventHandler,
): void {
  applyFind(config, state, find, derived, onEvent);
  state.finds = state.finds.filter((other) => other.id !== find.id);
  state.findRespawnAt[find.zone] =
    state.time +
    config.finds.respawnMin +
    nextRandom(state) * (config.finds.respawnMax - config.finds.respawnMin);
}

export function tickBuffs(config: GameConfig, state: GameState, harvestRate: number): void {
  const dt = config.dt;
  const buffs = state.buffs;
  if (harvestRate > 0 && buffs.feedingFrenzy > 0)
    buffs.feedingFrenzy = Math.max(0, buffs.feedingFrenzy - dt);
  buffs.layingBoost = Math.max(0, buffs.layingBoost - dt);
  buffs.breedingFrenzy = Math.max(0, buffs.breedingFrenzy - dt);
  if (state.travel && buffs.tailwind > 0) buffs.tailwind = Math.max(0, buffs.tailwind - dt);
}

export function respawnFinds(config: GameConfig, state: GameState): void {
  for (const key of Object.keys(state.findRespawnAt)) {
    const zone = +key;
    const respawnAt = state.findRespawnAt[zone];
    if (respawnAt !== undefined && state.time >= respawnAt) {
      delete state.findRespawnAt[zone];
      if (zone >= state.zone) state.finds.push(createFind(config, state, zone));
    }
  }
}
