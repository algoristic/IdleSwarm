import { newGame } from '../../domain/new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import { isCatchUpRequest, isCatchUpResponse } from './catch-up-service.utils';

const state = newGame(PROTOTYPE_GAME_CONFIG, 13, 1_000_000);

describe('isCatchUpRequest', () => {
  it('accepts a request', () => {
    expect(
      isCatchUpRequest({ type: 'catchUp', config: PROTOTYPE_GAME_CONFIG, state, seconds: 10 }),
    ).toBe(true);
  });

  it.each([
    null,
    'catchUp',
    { type: 'progress', config: PROTOTYPE_GAME_CONFIG, state, seconds: 10 },
    { type: 'catchUp', config: null, state, seconds: 10 },
    { type: 'catchUp', config: PROTOTYPE_GAME_CONFIG, state: 1, seconds: 10 },
    { type: 'catchUp', config: PROTOTYPE_GAME_CONFIG, state, seconds: '10' },
  ])('rejects %j', (value) => {
    expect(isCatchUpRequest(value)).toBe(false);
  });
});

describe('isCatchUpResponse', () => {
  it.each([
    { type: 'progress', done: 20000, total: 40000 },
    { type: 'done', state, summary: null },
    { type: 'done', state, summary: { seconds: 10 } },
  ])('accepts %j', (value) => {
    expect(isCatchUpResponse(value)).toBe(true);
  });

  it.each([
    undefined,
    { type: 'progress', done: 1 },
    { type: 'done', summary: null },
    { type: 'done', state, summary: 3 },
    { type: 'catchUp', state, summary: null },
  ])('rejects %j', (value) => {
    expect(isCatchUpResponse(value)).toBe(false);
  });
});
