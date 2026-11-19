import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';

import { createInitialState } from './game-state-logic';
import type { GameState } from './models/game-state.model';
import { effectSiteType, stateEffects, stateModifiers } from './modifiers-logic';

describe('stateModifiers (Game-Design §4.13)', () => {
  const initial = createInitialState({ seed: 'effekte', now: 1000 });

  it('ist beim Startzustand neutral', () => {
    expect(stateEffects(initial, DEFAULT_BALANCE)).toEqual([]);
    expect(stateModifiers(initial, DEFAULT_BALANCE)).toBe(NEUTRAL_MODIFIERS);
  });

  it('prüft Bedingungen gegen die aktuelle Futterstelle, während einer Reise gegen keine', () => {
    expect(effectSiteType(initial)).toBe('vent');
    const traveling: GameState = {
      ...initial,
      travel: { target: initial.map.candidates[0], remainingMs: 1000 },
    };
    expect(effectSiteType(traveling)).toBeNull();
  });
});
