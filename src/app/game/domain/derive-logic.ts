import { DerivedValues } from './models/derived-values.model';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { currentSite } from './site-logic';
import { reachFor, travelSpeedFor, upgradeEffect } from './upgrade-logic';

const MIN_FOOD = 1e-9;

export function derive(config: GameConfig, state: GameState): DerivedValues {
  const ranks = state.upgradeRanks;
  const buffs = state.buffs;
  const multipliers = config.finds.multipliers;
  const thrust = upgradeEffect(config, 'flagella', ranks.flagella);
  const baseSpeed = travelSpeedFor(config, thrust);
  const speed = baseSpeed * (buffs.tailwind > 0 ? multipliers.tailwind : 1);
  const digestion = upgradeEffect(config, 'digestion', ranks.digestion);
  const appetite =
    state.units[0] * digestion * (buffs.feedingFrenzy > 0 ? multipliers.feedingFrenzy : 1);
  const capacity = upgradeEffect(config, 'crop', ranks.crop);
  const site = currentSite(state);
  const eatingMarineSnow =
    site !== null &&
    !site.dead &&
    !!config.siteTypes[site.type].eggMultiplier &&
    state.lastHarvestRate > 0;
  const eggRate =
    upgradeEffect(config, 'hearth', ranks.hearth) *
    (eatingMarineSnow ? (config.siteTypes.marineSnow.eggMultiplier ?? Number.NaN) : 1) *
    (buffs.layingBoost > 0 ? multipliers.layingBoost : 1);
  const chainMultiplier = buffs.breedingFrenzy > 0 ? multipliers.breedingFrenzy : 1;
  const eatRate = appetite * Math.min(1, capacity / Math.max(state.food, MIN_FOOD));
  return {
    thrust,
    speed,
    baseSpeed,
    digestion,
    appetite,
    eatRate,
    capacity,
    eggRate,
    chainMultiplier,
    reach: reachFor(config, ranks.flagella),
  };
}
