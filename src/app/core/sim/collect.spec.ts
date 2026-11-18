import { DEFAULT_BALANCE, TICK_MS } from '../balance/constants';
import { droneFoodPerSecond, siteSecondsLeft } from '../balance/formulas';
import { Num } from '../num/num';
import { apply } from '../rules/commands';
import { createInitialState, GameState } from '../state/game-state';
import { applyCollect } from './collect';

interface Setup {
  readonly drones?: number;
  readonly food?: number;
  readonly stock: number;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function createState({ drones = 0, food = 0, stock }: Setup): GameState {
  const base = createInitialState({ seed: 'sammeln', now: 0 });
  return deepFreeze({
    ...base,
    res: { ...base.res, food: Num.from(food) },
    units: { ...base.units, drones: Num.from(drones) },
    site: { ...base.site, stock: Num.from(stock) },
  });
}

const collect = (state: GameState, dtMs: number = TICK_MS): GameState =>
  applyCollect(state, dtMs, DEFAULT_BALANCE);

describe('applyCollect', () => {
  it('rechnet den Sammel-Teil von Beispiel 1 aus Game-Design §4.3', () => {
    const { res, site } = collect(createState({ drones: 10, food: 5, stock: 1000 }));
    expect(res.food.eq(5.2)).toBe(true);
    expect(site.stock.eq(999.8)).toBe(true);
  });

  it('rechnet mit beliebiger Schrittdauer', () => {
    const { res, site } = collect(createState({ drones: 10, stock: 1000 }), 60_000);
    expect(res.food.eq(120)).toBe(true);
    expect(site.stock.eq(880)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...DEFAULT_BALANCE, droneCollectRate: 1 };
    const { res } = applyCollect(createState({ drones: 4, stock: 100 }), 1000, params);
    expect(res.food.eq(4)).toBe(true);
  });

  it.each([
    ['ohne Drohnen', { food: 5, stock: 100 }],
    ['bei leerem Vorrat', { drones: 10, food: 5, stock: 0 }],
  ])('gibt %s denselben Zustand zurück', (_name, setup) => {
    const input = createState(setup);
    expect(collect(input)).toBe(input);
  });

  it('gibt ohne Sammelrate denselben Zustand zurück', () => {
    const input = createState({ drones: 10, stock: 100 });
    const params = { ...DEFAULT_BALANCE, droneCollectRate: 0 };
    expect(applyCollect(input, TICK_MS, params)).toBe(input);
  });

  it('ändert Einheiten, Kaufzähler und DNA nicht', () => {
    const input = createState({ drones: 10, stock: 100 });
    const state = collect(input);
    expect(state.units).toBe(input.units);
    expect(state.bought).toBe(input.bought);
    expect(state.res.dna).toBe(input.res.dna);
  });

  it('verändert die eingefrorene Eingabe nicht', () => {
    const input = createState({ drones: 10, stock: 100 });
    const before = JSON.stringify(input);
    expect(collect(input)).not.toBe(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  describe('beim Leeren', () => {
    it('nimmt bei genau passendem Rest alles', () => {
      const { res, site } = collect(createState({ drones: 10, stock: 0.2 }));
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(0.2)).toBe(true);
    });

    it('nimmt höchstens den Vorrat', () => {
      const { res, site } = collect(createState({ drones: 10, food: 1, stock: 0.05 }));
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(1.05)).toBe(true);
    });

    it('senkt danach Rate und Restzeit auf 0', () => {
      const { units, site } = collect(createState({ drones: 10, stock: 0.05 }));
      expect(droneFoodPerSecond(units, site.stock, DEFAULT_BALANCE).isZero()).toBe(true);
      expect(siteSecondsLeft(units, site.stock, DEFAULT_BALANCE)?.isZero()).toBe(true);
    });

    it('sammelt danach nichts mehr', () => {
      const emptied = collect(createState({ drones: 10, stock: 0.05 }));
      expect(collect(emptied)).toBe(emptied);
    });

    it('läuft über viele Schritte genau leer', () => {
      let state = createState({ drones: 7, stock: 10 });
      let steps = 0;
      while (!state.site.stock.isZero() && steps < 1000) {
        state = collect(state);
        expect(state.site.stock.isNegative()).toBe(false);
        steps++;
      }
      expect(state.site.stock).toBe(Num.ZERO);
      expect(steps).toBe(72);
      expect(state.res.food.toNumber()).toBeCloseTo(10, 9);
    });

    it.each([0.2, 1, 999.9])('räumt Rundungsreste um %d spätestens im Folgeschritt ab', (stock) => {
      // Die Sammelmenge liegt so bis auf Rundung genau beim Vorrat.
      const params = { ...DEFAULT_BALANCE, droneCollectRate: stock };
      for (let i = -50; i <= 50; i++) {
        const input = createState({ drones: 1, stock: stock * (1 + i * 1e-15) });
        const first = applyCollect(input, 1000, params);
        expect(first.site.stock.isNegative()).toBe(false);
        const second = applyCollect(first, 1000, params);
        expect(second.site.stock).toBe(Num.ZERO);
      }
    });

    it('lässt ohne Drohnen den Klick einen winzigen Rest abräumen', () => {
      const input = createState({ stock: 1e-13 });
      const { res, site } = apply(input, { type: 'click' });
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(1e-13)).toBe(true);
    });

    it('gibt die Futterstelle für „Neue Futterstelle“ frei', () => {
      const emptied = collect(createState({ drones: 10, food: 3, stock: 0.05 }));
      const renewed = apply(emptied, { type: 'newSite' });
      expect(renewed.site.stock.eq(renewed.site.size)).toBe(true);
      expect(renewed.res).toBe(emptied.res);
      expect(renewed.units).toBe(emptied.units);
    });
  });

  describe('Erhaltung', () => {
    it.each([
      ['glatte Werte', 10, 100],
      ['krumme Drohnenzahl', 1 / 3, 16],
      ['wenige Drohnen', 0.0075, 100],
    ])('überträgt genau die entnommene Menge: %s', (_name, drones, dtMs) => {
      const stock = 20_000;
      let state = createState({ drones, stock });
      for (let i = 0; i < 5000; i++) {
        state = collect(state, dtMs);
      }
      const taken = stock - state.site.stock.toNumber();
      const expected = drones * 0.2 * (dtMs / 1000) * 5000;
      expect(state.res.food.toNumber()).toBeCloseTo(taken, 6);
      expect(state.res.food.toNumber()).toBeCloseTo(expected, 6);
    });

    it('erzeugt keine Nahrung, wenn die Menge den Vorrat nicht mehr ändert', () => {
      const input = createState({ drones: 1e-12, stock: 20_000 });
      expect(collect(input)).toBe(input);
    });

    it('erhält die Summe auch bis zum Leeren', () => {
      let state = createState({ drones: 3.3, stock: 50 });
      for (let i = 0; i < 1000; i++) {
        state = collect(state);
      }
      expect(state.site.stock).toBe(Num.ZERO);
      expect(state.res.food.toNumber()).toBeCloseTo(50, 9);
    });
  });
});
