import { createInitialState, Units } from '../state/game-state';
import { UNIT_TYPES } from './units';

describe('Einheitentypen', () => {
  it('hält die stabilen IDs fest', () => {
    expect(UNIT_TYPES).toEqual(['queens', 'drones', 'soldiers']);
  });

  it('passt zu den Schlüsseln von Einheiten und Kaufzählern', () => {
    const types: readonly (keyof Units)[] = UNIT_TYPES;
    const { units, bought } = createInitialState({ seed: 'idleswarm', now: 0 });
    expect(Object.keys(units)).toEqual([...types]);
    expect(Object.keys(bought)).toEqual([...types]);
  });
});
