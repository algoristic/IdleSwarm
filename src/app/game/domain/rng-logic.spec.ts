import { DEFAULT_GAME_CONFIG } from './data/game-config.data';
import { FIND_IDS } from './models/find.model';
import { SITE_TYPE_IDS } from './models/site.model';
import { nextRandom, pickWeighted } from './rng-logic';

function firstValues(seed: number): number[] {
  const state = { rngState: seed };
  const values = Array.from({ length: 5 }, () => nextRandom(state));
  return [...values, state.rngState];
}

describe('nextRandom', () => {
  it('matches mulberry32 of the prototype', () => {
    expect(firstValues(1)).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741,
      0.9683778982143849, 567894474,
    ]);
    expect(firstValues(4242)).toEqual([
      0.5467061335220933, 0.27860878920182586, 0.9312369171530008, 0.5072224664036185,
      0.668778280261904, 567898715,
    ]);
    expect(firstValues(0)).toEqual([
      0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111,
      0.46732782293111086, 567894473,
    ]);
    expect(firstValues(-123456789)).toEqual([
      0.9335711891762912, 0.2907314267940819, 0.865351774264127, 0.04375693411566317,
      0.5729067635256797, 444437684,
    ]);
  });
});

describe('pickWeighted', () => {
  it('picks finds like the prototype', () => {
    const state = { rngState: 4242 };
    const picks = Array.from({ length: 12 }, () =>
      pickWeighted(state, DEFAULT_GAME_CONFIG.finds.weights, FIND_IDS),
    );
    expect(picks).toEqual([
      'tailwind',
      'layingBoost',
      'growthSpurt',
      'tailwind',
      'foodBubble',
      'layingBoost',
      'layingBoost',
      'breedingFrenzy',
      'breedingFrenzy',
      'foodBubble',
      'foodBubble',
      'eggBall',
    ]);
    expect(state.rngState).toBe(503957518);
  });

  it('skips missing weights like the prototype', () => {
    const state = { rngState: 7 };
    const picks = Array.from({ length: 12 }, () =>
      pickWeighted(state, DEFAULT_GAME_CONFIG.spawn.weights, SITE_TYPE_IDS),
    );
    expect(picks).toEqual([
      'algae',
      'algae',
      'marineSnow',
      'carcass',
      'plankton',
      'algae',
      'algae',
      'algae',
      'plankton',
      'carcass',
      'algae',
      'algae',
    ]);
  });

  it('falls back to the last present entry when all weights are zero', () => {
    const state = { rngState: 99 };
    const picks = Array.from({ length: 3 }, () =>
      pickWeighted(state, { algae: 0, carcass: 0 }, SITE_TYPE_IDS),
    );
    expect(picks).toEqual(['carcass', 'carcass', 'carcass']);
  });
});
