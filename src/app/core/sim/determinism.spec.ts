import { DEFAULT_BALANCE, TICK_MS } from '../balance/constants';
import { UNIT_TYPES } from '../data/units';
import { Num } from '../num/num';
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
    state = apply(state, { type: i % 2 === 0 ? 'noop' : 'newSite' });
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

/** Drohnen leeren eine kleine Futterstelle immer wieder, danach wird sie erneuert. */
function collectUntilRenewed(seed: string): { json: string; renewals: number } {
  const base = createInitialState({ seed, now: NOW }, { ...DEFAULT_BALANCE, siteSize: 3 });
  let state: GameState = { ...base, units: { ...base.units, drones: Num.from(7) } };
  let renewals = 0;
  for (let i = 0; i < 1000; i++) {
    state = step(state, TICK_MS).state;
    if (state.site.stock.isZero()) {
      state = apply(state, { type: 'newSite' });
      renewals++;
    }
  }
  return { json: JSON.stringify(state), renewals };
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

  it('bleibt beim Sammeln über geleerte Futterstellen hinweg gleich', () => {
    const first = collectUntilRenewed('idleswarm');
    expect(first.renewals).toBeGreaterThan(0);
    expect(collectUntilRenewed('idleswarm')).toEqual(first);
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
