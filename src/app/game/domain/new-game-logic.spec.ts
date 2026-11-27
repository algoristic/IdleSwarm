import { DEFAULT_GAME_CONFIG } from './data/game-config.data';
import { newGame } from './new-game-logic';
import {
  NEW_GAME_NOW,
  NEW_GAME_SEED_13,
  NEW_GAME_SEED_4242,
  NEW_GAME_SEED_NEGATIVE,
} from './new-game-logic.fixture';

describe('newGame', () => {
  it('creates the start state of the prototype for seed 4242', () => {
    expect(newGame(DEFAULT_GAME_CONFIG, 4242, NEW_GAME_NOW)).toEqual(NEW_GAME_SEED_4242);
  });

  it('creates the start state of the prototype for a negative seed', () => {
    expect(newGame(DEFAULT_GAME_CONFIG, -123456789, NEW_GAME_NOW)).toEqual(NEW_GAME_SEED_NEGATIVE);
  });

  it('rejects a placement too close to a site and discovers sites in the current zone', () => {
    expect(newGame(DEFAULT_GAME_CONFIG, 13, NEW_GAME_NOW)).toEqual(NEW_GAME_SEED_13);
  });
});
