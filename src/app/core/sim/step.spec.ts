import { DEFAULT_BALANCE, TICK_MS, TICKS_PER_SECOND } from '../balance/constants';
import { Num } from '../num/num';
import { apply } from '../rules/commands';
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

  it('hängt die Brut bei genug Nahrung kaum von der Schrittweite ab', () => {
    // Ohne Sammeln: Im feinen Raster sammeln frisch geschlüpfte Drohnen sonst schon mit.
    const params = { ...DEFAULT_BALANCE, startFood: 1000, droneCollectRate: 0 };
    const input = deepFreeze(createInitialState({ seed: 'step', now: NOW }, params));
    let fine = input;
    for (let i = 0; i < 10; i++) {
      fine = step(fine, TICK_MS, params).state;
    }
    const coarse = step(input, 10 * TICK_MS, params).state;
    expect(fine.time).toEqual(coarse.time);
    expect(fine.units.drones.toNumber()).toBeCloseTo(coarse.units.drones.toNumber(), 10);
    expect(fine.units.soldiers.toNumber()).toBeCloseTo(coarse.units.soldiers.toNumber(), 10);
    expect(fine.res.food.toNumber()).toBeCloseTo(coarse.res.food.toNumber(), 10);
  });

  describe('mit Sammeln', () => {
    const swarm = (queens: number, drones: number, food: number, stock: number): GameState => {
      const base = createState();
      return deepFreeze({
        ...base,
        res: { ...base.res, food: Num.from(food) },
        units: { queens: Num.from(queens), drones: Num.from(drones), soldiers: Num.ZERO },
        site: { ...base.site, stock: Num.from(stock) },
      });
    };

    it('rechnet Beispiel 1 aus Game-Design §4.3 vollständig', () => {
      const { res, site, units } = step(swarm(1, 10, 5, 1000), TICK_MS).state;
      expect(res.food.toNumber()).toBeCloseTo(5.0625, 10);
      expect(site.stock.toNumber()).toBeCloseTo(999.8, 10);
      expect(units.drones.toNumber()).toBeCloseTo(10.0075, 10);
      expect(units.soldiers.toNumber()).toBeCloseTo(0.0025, 10);
    });

    it('sammelt vor der Brut, frische Nahrung reicht im selben Schritt', () => {
      const { res, units } = step(swarm(1, 10, 0, 1000), TICK_MS).state;
      expect(units.soldiers.toNumber()).toBeCloseTo(0.0025, 10);
      expect(res.food.toNumber()).toBeCloseTo(0.0625, 10);
    });

    it('sammelt mit den Drohnen vom Anfang des Schritts', () => {
      const { site } = step(swarm(100, 10, 1000, 1000), 1000).state;
      expect(site.stock.toNumber()).toBeCloseTo(998, 10);
    });

    it('reicht die Parameter an das Sammeln weiter', () => {
      const params = { ...DEFAULT_BALANCE, droneCollectRate: 1 };
      const { res, site } = step(swarm(0, 10, 0, 1000), 1000, params).state;
      expect(res.food.eq(10)).toBe(true);
      expect(site.stock.eq(990)).toBe(true);
    });

    it('lässt die Brut bei leerem Vorrat weiterlaufen', () => {
      const input = swarm(1, 10, 5, 0);
      const { state } = step(input, TICK_MS);
      expect(state.site).toBe(input.site);
      expect(state.res.food.toNumber()).toBeCloseTo(4.8625, 10);
      expect(state.units.drones.toNumber()).toBeCloseTo(10.0075, 10);
    });

    it('macht die Futterstelle nach dem Leeren wieder nutzbar', () => {
      const emptied = step(swarm(0, 10, 0, 0.2), TICK_MS).state;
      expect(emptied.site.stock).toBe(Num.ZERO);
      const renewed = apply(emptied, { type: 'newSite' });
      expect(renewed.site.stock.eq(renewed.site.size)).toBe(true);
      expect(renewed.res.food.eq(0.2)).toBe(true);
      expect(renewed.units).toBe(emptied.units);
    });
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
