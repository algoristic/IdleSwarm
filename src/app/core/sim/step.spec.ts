import { DEFAULT_BALANCE, TICK_MS, TICKS_PER_SECOND } from '../balance/constants';
import { Num } from '../num/num';
import { createInitialState, GameState } from '../state/game-state';
import { step, syncClock } from './step';

const NOW = 1_700_000_000_000;

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('step', () => {
  const createState = (): GameState => deepFreeze(createInitialState({ seed: 'step', now: NOW }));

  it('erhöht now und played um dtMs', () => {
    const { state, events } = step(createState(), TICK_MS);
    expect(state.time).toEqual({ now: NOW + TICK_MS, lastSaved: NOW, played: TICK_MS });
    expect(events).toEqual([]);
  });

  it('verändert die eingefrorene Eingabe nicht', () => {
    const input = createState();
    const before = JSON.stringify(input);
    const { state } = step(input, TICK_MS);
    expect(state).not.toBe(input);
    expect(state.time).not.toBe(input.time);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('teilt alle Teile, die der Schritt nicht ändert', () => {
    const input = createState();
    const { state } = step(input, TICK_MS);
    expect(state.site).toBe(input.site);
    expect(state.bought).toBe(input.bought);
    expect(state.rngState).toBe(input.rngState);
    expect(state.seed).toBe(input.seed);
    expect(state.era).toBe(input.era);
    expect(state.version).toBe(input.version);
  });

  it('lässt Königinnen brüten', () => {
    const { state } = step(createState(), TICK_MS);
    expect(state.units.drones.eq(0.0075)).toBe(true);
    expect(state.units.soldiers.eq(0.0025)).toBe(true);
    expect(state.res.food.eq(14.8625)).toBe(true);
  });

  it('reicht die Parameter an die Brut weiter', () => {
    const params = { ...DEFAULT_BALANCE, queenEggsPerMin: 60, broodDroneShare: 1 };
    const { state } = step(createState(), 1000, params);
    expect(state.units.drones.eq(1)).toBe(true);
    expect(state.units.soldiers.isZero()).toBe(true);
    expect(state.res.food.eq(5)).toBe(true);
  });

  it('hängt bei genug Nahrung kaum von der Schrittweite ab', () => {
    const input = deepFreeze(
      createInitialState({ seed: 'step', now: NOW }, { ...DEFAULT_BALANCE, startFood: 1000 }),
    );
    let fine = input;
    for (let i = 0; i < 10; i++) {
      fine = step(fine, TICK_MS).state;
    }
    const coarse = step(input, 10 * TICK_MS).state;
    expect(fine.time).toEqual(coarse.time);
    expect(fine.units.drones.toNumber()).toBeCloseTo(coarse.units.drones.toNumber(), 10);
    expect(fine.units.soldiers.toNumber()).toBeCloseTo(coarse.units.soldiers.toNumber(), 10);
    expect(fine.res.food.toNumber()).toBeCloseTo(coarse.res.food.toNumber(), 10);
  });

  it('liefert bei gleicher Eingabe dasselbe Ergebnis', () => {
    const input = createState();
    expect(JSON.stringify(step(input, 250))).toBe(JSON.stringify(step(input, 250)));
  });

  it('lässt Zustand ohne Königinnen bis auf die Zeit unverändert', () => {
    const base = createState();
    const input = deepFreeze({ ...base, units: { ...base.units, queens: Num.ZERO } });
    const { state } = step(input, TICK_MS);
    expect(state.res).toBe(input.res);
    expect(state.units).toBe(input.units);
    expect(state.time.played).toBe(TICK_MS);
  });

  it.each([0, -0])('gibt bei dtMs %d denselben Zustand zurück', (dtMs) => {
    const input = createState();
    const { state, events } = step(input, dtMs);
    expect(state).toBe(input);
    expect(events).toEqual([]);
  });

  it.each([-1, -Number.MIN_VALUE, Number.NaN, Infinity, -Infinity])(
    'wirft bei ungültigem dtMs %d einen RangeError',
    (dtMs) => {
      expect(() => step(createState(), dtMs)).toThrow(RangeError);
    },
  );

  it('summiert die Zeit über viele Ticks exakt', () => {
    const input = createState();
    const ticks = 3600 * TICKS_PER_SECOND;
    let state = input;
    for (let i = 0; i < ticks; i++) {
      const result = step(state, TICK_MS);
      expect(result.events).toHaveLength(0);
      state = deepFreeze(result.state);
    }
    expect(state.time).toEqual({ now: NOW + 3_600_000, lastSaved: NOW, played: 3_600_000 });
    expect(state.rngState).toBe(input.rngState);
  });
});

describe('syncClock', () => {
  const createState = (): GameState =>
    deepFreeze(step(createInitialState({ seed: 'sync', now: NOW }), TICK_MS).state);

  it('setzt nur time.now und lässt played und lastSaved unverändert', () => {
    const input = createState();
    const state = syncClock(input, NOW + 60_000);
    expect(state.time).toEqual({ now: NOW + 60_000, lastSaved: NOW, played: TICK_MS });
    expect(state.res).toBe(input.res);
    expect(input.time.now).toBe(NOW + TICK_MS);
  });

  it('gibt bei gleichem Wert dieselbe Referenz zurück', () => {
    const input = createState();
    expect(syncClock(input, input.time.now)).toBe(input);
  });

  it.each([-1, Number.NaN, Infinity, -Infinity])('wirft bei ungültigem nowMs %d', (nowMs) => {
    expect(() => syncClock(createState(), nowMs)).toThrow(RangeError);
  });
});
