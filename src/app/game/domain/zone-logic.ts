import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { NextZone } from './models/zone.model';

export function nextZone(
  config: GameConfig,
  state: Pick<GameState, 'zone'>,
  thrust: number,
): NextZone | null {
  const zone = state.zone + 1;
  if (zone >= config.zones.length) return null;
  const threshold = config.zones[zone].threshold;
  return { zone, threshold, open: thrust >= threshold };
}
