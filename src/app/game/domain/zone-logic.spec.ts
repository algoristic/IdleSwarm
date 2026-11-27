import { DEFAULT_GAME_CONFIG } from './data/game-config.data';
import { GameConfig } from './models/game-config.model';
import { nextZone } from './zone-logic';

const config: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  zones: [
    { id: 'droplet', threshold: 0 },
    { id: 'tidePool', threshold: 500 },
    { id: 'rockPool', threshold: 2e4 },
    { id: 'shallows', threshold: 1e6 },
  ],
};

describe('nextZone', () => {
  it('is locked below the threshold of the next zone', () => {
    expect(nextZone(config, { zone: 0 }, 499)).toEqual({ zone: 1, threshold: 500, open: false });
  });

  it('is open from the threshold on', () => {
    expect(nextZone(config, { zone: 2 }, 1e6)).toEqual({ zone: 3, threshold: 1e6, open: true });
  });

  it('is null in the last zone', () => {
    expect(nextZone(config, { zone: 3 }, 1e9)).toBeNull();
  });
});
