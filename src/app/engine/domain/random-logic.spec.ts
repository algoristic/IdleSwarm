import { nextRandom } from '@app/shared/util/rng/rng';

import { createInitialState } from './game-state-logic';
import type { GameState } from './models/game-state.model';
import { drawRandom } from './random-logic';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function sequence(rngState: number, length: number): number[] {
  const values: number[] = [];
  let current = rngState;
  for (let i = 0; i < length; i++) {
    const result = nextRandom(current);
    values.push(result.value);
    current = result.rngState;
  }
  return values;
}

describe('drawRandom', () => {
  const createState = (): GameState =>
    deepFreeze(createInitialState({ seed: 'idleswarm', now: 1000 }));

  it('schreibt den RNG-Zustand fort, ohne die Eingabe zu verändern', () => {
    const state = createState();
    const before = JSON.stringify(state);
    const expected = nextRandom(state.rngState);

    const result = drawRandom(state);

    expect(result.value).toBe(expected.value);
    expect(result.state.rngState).toBe(expected.rngState);
    expect(result.state).not.toBe(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('ändert nur rngState und teilt alle übrigen Teile', () => {
    const state = createState();
    const { state: next } = drawRandom(state);
    expect({ ...next, rngState: state.rngState }).toEqual(state);
    expect(next.time).toBe(state.time);
    expect(next.res).toBe(state.res);
    expect(next.units).toBe(state.units);
  });

  it('liefert bei fortlaufenden Ziehungen dieselbe Folge wie nextRandom', () => {
    let state = createState();
    // Die Startkandidaten haben den Zustand schon fortgeschrieben; die Folge beginnt dort.
    const start = state.rngState;
    const values: number[] = [];
    for (let i = 0; i < 6; i++) {
      const result = drawRandom(state);
      values.push(result.value);
      state = result.state;
    }
    expect(values).toEqual(sequence(start, 6));
  });
});
