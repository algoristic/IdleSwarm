import { Find, FIND_IDS } from './models/find.model';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { pickWeighted } from './rng-logic';
import { placeInDisc } from './site-logic';

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
