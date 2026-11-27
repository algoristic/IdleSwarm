import { produce } from './chain-logic';
import { derive } from './derive-logic';
import { respawnFinds, tickBuffs } from './find-logic';
import { harvest } from './harvest-logic';
import { GameConfig } from './models/game-config.model';
import { GameEventHandler } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { currentSite, discover, removeGoneSites, spawnNewSites, updateSites } from './site-logic';
import { advanceTravel, expireMark, moveOn } from './travel-logic';

export function step(config: GameConfig, state: GameState, onEvent?: GameEventHandler): void {
  const derived = derive(config, state);
  produce(config, state, derived);
  const harvestRate = harvest(config, state, derived);
  tickBuffs(config, state, harvestRate);
  updateSites(config, state, onEvent);
  removeGoneSites(state, onEvent);
  advanceTravel(config, state, derived, onEvent);

  const after = derive(config, state);
  discover(state, after.reach);
  spawnNewSites(config, state, after);
  respawnFinds(config, state);
  expireMark(config, state, after, onEvent);
  moveOn(config, state, after, onEvent);
  checkEnd(config, state, onEvent);
  state.time += config.dt;
}

function checkEnd(config: GameConfig, state: GameState, onEvent?: GameEventHandler): void {
  const site = currentSite(state);
  if (
    !state.ended &&
    site &&
    config.siteTypes[site.type].goal &&
    state.lastHarvestRate > 0 &&
    state.units[config.units.length - 1] >= 1
  ) {
    state.ended = true;
    state.stats.endedAt = state.time;
    onEvent?.({ type: 'ended' });
  }
}
