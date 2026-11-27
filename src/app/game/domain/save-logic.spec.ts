import { harvestHistoryLength } from './harvest-logic';
import { newGame } from './new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from './prototype-game-config.fixture';
import { migrate, parseSave, serializeGame } from './save-logic';
import { CHAIN_UPGRADE_COUNT } from './upgrade-logic';

const config = PROTOTYPE_GAME_CONFIG;
const NOW = 1_700_000_000_000;
const SEED = 4242;

function savedGame(changes: Record<string, unknown>): string {
  return JSON.stringify({ ...newGame(config, 77, NOW - 1000), ...changes });
}

describe('parseSave', () => {
  it('starts a fresh game without a save', () => {
    expect(parseSave(config, null, SEED, NOW)).toEqual({
      state: newGame(config, SEED, NOW),
      outcome: 'fresh',
    });
    expect(parseSave(config, '', SEED, NOW).outcome).toBe('fresh');
  });

  it('resets on broken JSON', () => {
    expect(parseSave(config, '{"version":', SEED, NOW)).toEqual({
      state: newGame(config, SEED, NOW),
      outcome: 'reset',
    });
  });

  it('resets on another version', () => {
    expect(parseSave(config, savedGame({ version: 3 }), SEED, NOW).outcome).toBe('reset');
  });

  it('resets when sites is not an array', () => {
    expect(parseSave(config, savedGame({ sites: {} }), SEED, NOW).outcome).toBe('reset');
    expect(parseSave(config, 'null', SEED, NOW).outcome).toBe('reset');
  });

  it('loads a serialized game unchanged', () => {
    const state = newGame(config, 13, NOW - 5000);
    state.food = 123.5;
    state.upgradeRanks.flagella = 2;
    expect(parseSave(config, serializeGame(state), SEED, NOW)).toEqual({
      state,
      outcome: 'loaded',
    });
  });
});

describe('migrate', () => {
  it('fills missing fields from a new game with the saved seed', () => {
    const state = migrate(config, { version: 1, sites: [], seed: 13, food: 7 }, NOW);
    const base = newGame(config, 13, NOW);
    expect(state).toEqual({ ...base, sites: [], food: 7 });
  });

  it('uses seed 1 without a saved seed', () => {
    expect(migrate(config, { version: 1, sites: [] }, NOW)?.rngState).toBe(
      newGame(config, 1, NOW).rngState,
    );
  });

  it('merges partial stats, buffs and upgrade ranks', () => {
    const state = migrate(
      config,
      {
        version: 1,
        sites: [],
        seed: 5,
        stats: { travels: 4 },
        buffs: { tailwind: 3 },
        upgradeRanks: { crop: 2 },
      },
      NOW,
    );
    const base = newGame(config, 5, NOW);
    expect(state?.stats).toEqual({ ...base.stats, travels: 4 });
    expect(state?.buffs).toEqual({ ...base.buffs, tailwind: 3 });
    expect(state?.upgradeRanks).toEqual({ ...base.upgradeRanks, crop: 2 });
  });

  it('replaces chain ranks of the wrong length', () => {
    const state = migrate(config, { version: 1, sites: [], chainRanks: [1, 2] }, NOW);
    expect(state?.chainRanks).toEqual(new Array(CHAIN_UPGRADE_COUNT).fill(0));
  });

  it('resets a harvest history of the wrong length', () => {
    const state = migrate(
      config,
      {
        version: 1,
        sites: [],
        harvestHistory: [1, 2, 3],
        harvestHistoryIndex: 2,
        harvestHistorySum: 6,
      },
      NOW,
    );
    expect(state?.harvestHistory).toEqual(new Array(harvestHistoryLength(config)).fill(0));
    expect(state?.harvestHistoryIndex).toBe(0);
    expect(state?.harvestHistorySum).toBe(0);
  });
});
