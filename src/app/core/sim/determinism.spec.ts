import { DEFAULT_BALANCE, TICK_MS } from '../balance/constants';
import { UNIT_TYPES } from '../data/units';
import { nextRandom, drawRandom } from '../rng/rng';
import { apply } from '../rules/commands';
import { createInitialState, GameState } from '../state/game-state';
import { step } from './step';

const NOW = 1_700_000_000_000;

/** Feste Abfolge aus Kommandos, Käufen, Ticks und RNG-Ziehungen. */
function play(seed: string): { json: string; values: number[]; state: GameState } {
  // Genug Startnahrung, damit auch Königinnen und Soldaten gekauft werden.
  let state = createInitialState({ seed, now: NOW }, { ...DEFAULT_BALANCE, startFood: 1000 });
  const values: number[] = [];
  for (let i = 0; i < 1000; i++) {
    state = apply(state, { type: i % 2 === 0 ? 'click' : 'newSite' });
    if (i % 5 === 0) {
      state = apply(state, { type: 'buy', unit: UNIT_TYPES[i % UNIT_TYPES.length] });
    }
    state = step(state, TICK_MS).state;
    if (i % 3 === 0) {
      const result = drawRandom(state);
      values.push(result.value);
      state = result.state;
    }
  }
  return { json: JSON.stringify(state), values, state };
}

describe('Determinismus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liefert bei gleichem Seed und gleicher Abfolge denselben Zustand', () => {
    const first = play('idleswarm');
    const second = play('idleswarm');
    expect(second.json).toBe(first.json);
    expect(second.values).toEqual(first.values);
  });

  it('enthält in der Abfolge Käufe jedes Einheitentyps', () => {
    const { bought } = play('idleswarm').state;
    for (const unit of UNIT_TYPES) {
      expect(bought[unit].gt(0)).toBe(true);
    }
  });

  it('liefert bei anderem Seed einen anderen Verlauf', () => {
    const first = play('idleswarm');
    const other = play('ameisenhaufen');
    expect(other.json).not.toBe(first.json);
    expect(other.values).not.toEqual(first.values);
  });

  it('hängt nicht von Uhr oder globalem Zufall ab', () => {
    const expected = play('idleswarm');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(0);

    expect(play('idleswarm').json).toBe(expected.json);
    nextRandom(1);
    expect(random).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });
});
