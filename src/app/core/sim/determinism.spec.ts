import { TICK_MS } from '../balance/constants';
import { nextRandom, drawRandom } from '../rng/rng';
import { apply } from '../rules/commands';
import { createInitialState } from '../state/game-state';
import { step } from './step';

const NOW = 1_700_000_000_000;

/** Feste Abfolge aus Kommandos, Ticks und RNG-Ziehungen. */
function play(seed: string): { json: string; values: number[] } {
  let state = createInitialState({ seed, now: NOW });
  const values: number[] = [];
  for (let i = 0; i < 1000; i++) {
    state = apply(state, { type: 'noop' });
    state = step(state, TICK_MS).state;
    if (i % 3 === 0) {
      const result = drawRandom(state);
      values.push(result.value);
      state = result.state;
    }
  }
  return { json: JSON.stringify(state), values };
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
