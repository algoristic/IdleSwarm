import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { TICK_MS } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { foodPerSecond, siteSecondsLeft } from '@app/balance/domain/formulas';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { applyCollect, collectStep } from './collect-logic';

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
  applyCollect(state, dtMs, BALANCE_V1, NEUTRAL_MODIFIERS);

describe('applyCollect', () => {
  it('rechnet Grundertrag und Sammeln aus Beispiel 1 in Game-Design §4.3', () => {
    const { res, site } = collect(createState({ drones: 10, food: 5, stock: 1000 }));
    expect(res.food.toNumber()).toBeCloseTo(5.35, 12);
    expect(site.stock.toNumber()).toBeCloseTo(999.65, 12);
  });

  it('liefert ohne Drohnen den Grundertrag', () => {
    const { res, site } = collect(createState({ food: 5, stock: 100 }));
    expect(res.food.toNumber()).toBeCloseTo(5.15, 12);
    expect(site.stock.toNumber()).toBeCloseTo(99.85, 12);
  });

  it('rechnet mit beliebiger Schrittdauer', () => {
    const { res, site } = collect(createState({ drones: 10, stock: 1000 }), 60_000);
    expect(res.food.eq(210)).toBe(true);
    expect(site.stock.eq(790)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 2, droneCollectRate: 1 };
    const { res } = applyCollect(
      createState({ drones: 4, stock: 100 }),
      1000,
      params,
      NEUTRAL_MODIFIERS,
    );
    expect(res.food.eq(6)).toBe(true);
  });

  it('gibt bei leerem Vorrat denselben Zustand zurück (Beispiel 2 aus Game-Design §4.3)', () => {
    const input = createState({ drones: 10, food: 0.05, stock: 0 });
    expect(collect(input)).toBe(input);
    expect(collect(createState({ food: 0.05, stock: 0 })).res.food.eq(0.05)).toBe(true);
  });

  it('gibt ohne Grundertrag und Sammelrate denselben Zustand zurück', () => {
    const input = createState({ drones: 10, stock: 100 });
    const params = { ...BALANCE_V1, baseFoodRate: 0, droneCollectRate: 0 };
    expect(applyCollect(input, TICK_MS, params, NEUTRAL_MODIFIERS)).toBe(input);
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
      const { res, site } = collect(createState({ drones: 10, stock: 0.35 }));
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(0.35)).toBe(true);
    });

    it('nimmt höchstens den Vorrat', () => {
      const { res, site } = collect(createState({ drones: 10, food: 1, stock: 0.05 }));
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(1.05)).toBe(true);
    });

    it('senkt danach Rate und Restzeit auf 0', () => {
      const { units, site } = collect(createState({ drones: 10, stock: 0.05 }));
      expect(foodPerSecond(units, site.stock, BALANCE_V1).isZero()).toBe(true);
      expect(siteSecondsLeft(units, site.stock, BALANCE_V1)?.isZero()).toBe(true);
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
      expect(steps).toBe(35);
      expect(state.res.food.toNumber()).toBeCloseTo(10, 9);
    });

    it.each([0.2, 1, 999.9])('räumt Rundungsreste um %d spätestens im Folgeschritt ab', (stock) => {
      // Die Sammelmenge liegt so bis auf Rundung genau beim Vorrat.
      const params = { ...BALANCE_V1, baseFoodRate: 0, droneCollectRate: stock };
      for (let i = -50; i <= 50; i++) {
        const input = createState({ drones: 1, stock: stock * (1 + i * 1e-15) });
        const first = applyCollect(input, 1000, params, NEUTRAL_MODIFIERS);
        expect(first.site.stock.isNegative()).toBe(false);
        const second = applyCollect(first, 1000, params, NEUTRAL_MODIFIERS);
        expect(second.site.stock).toBe(Num.ZERO);
      }
    });

    it('räumt ohne Drohnen über den Grundertrag einen winzigen Rest ab', () => {
      const { res, site } = collect(createState({ stock: 1e-13 }));
      expect(site.stock).toBe(Num.ZERO);
      expect(res.food.eq(1e-13)).toBe(true);
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
      const expected = (1.5 + drones * 0.2) * (dtMs / 1000) * 5000;
      expect(state.res.food.toNumber()).toBeCloseTo(taken, 6);
      expect(state.res.food.toNumber()).toBeCloseTo(expected, 6);
    });

    it('erzeugt keine Nahrung, wenn die Menge den Vorrat nicht mehr ändert', () => {
      const input = createState({ stock: 1e20 });
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

describe('collectStep', () => {
  it('meldet ohne Leeren kein Ereignis', () => {
    const input = createState({ drones: 10, stock: 1000 });
    const { state, events } = collectStep(input, TICK_MS, 0, BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(state).toEqual(collect(input));
    expect(events).toEqual([]);
  });

  it('meldet siteDepleted mit dem Zeitpunkt, an dem der Vorrat leer wurde', () => {
    // 3,5 Nahrung/s leeren 0,7 nach 200 ms eines 1000-ms-Schritts ab Spielzeit 5000.
    const input = createState({ drones: 10, stock: 0.7 });
    const { state, events } = collectStep(input, 1000, 5000, BALANCE_V1, NEUTRAL_MODIFIERS);
    expect(state.site.stock).toBe(Num.ZERO);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('siteDepleted');
    expect(events[0].siteType).toBe('vent');
    expect(events[0].playedMs).toBeCloseTo(5200, 9);
  });

  it('legt den Zeitpunkt bei genau passendem Rest auf das Schrittende', () => {
    const { events } = collectStep(
      createState({ drones: 10, stock: 0.35 }),
      TICK_MS,
      0,
      BALANCE_V1,
      NEUTRAL_MODIFIERS,
    );
    expect(events[0].playedMs).toBeCloseTo(TICK_MS, 9);
  });

  it('meldet einen schon leeren Vorrat nicht erneut', () => {
    const input = createState({ drones: 10, stock: 0 });
    expect(collectStep(input, TICK_MS, 0, BALANCE_V1, NEUTRAL_MODIFIERS)).toEqual({
      state: input,
      events: [],
    });
  });
});
