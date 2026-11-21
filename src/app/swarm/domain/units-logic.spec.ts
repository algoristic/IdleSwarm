import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { unitPrice } from '@app/balance/domain/formulas';
import { apply } from '@app/engine/domain/commands-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { UNIT_TYPES, UnitType } from './models/units.model';
import { canBuy } from './units-logic';

const initial = createInitialState({ seed: 'idleswarm', now: 1000 }, BALANCE_V1);

/** Tief eingefrorener Zustand; Schreibzugriffe würden im Strict Mode werfen. */
function stateWith(food: Num | number, boughtCount = 0): GameState {
  const count = Num.from(boughtCount);
  return Object.freeze({
    ...initial,
    time: Object.freeze({ ...initial.time }),
    res: Object.freeze({ ...initial.res, food: Num.from(food) }),
    units: Object.freeze({ ...initial.units }),
    site: Object.freeze({ ...initial.site }),
    bought: Object.freeze({ queens: count, drones: count, soldiers: count }),
  });
}

function priceOf(unit: UnitType, state: GameState): Num {
  return unitPrice(unit, state.bought, BALANCE_V1);
}

describe('buy', () => {
  it.each<[UnitType, number]>([
    ['drones', 90],
    ['soldiers', 75],
    ['queens', 40],
  ])('kauft %s zum aktuellen Preis', (unit, food) => {
    const state = stateWith(100);
    const next = apply(state, { type: 'buy', unit }, BALANCE_V1);
    expect(next.res.food.eq(food)).toBe(true);
    expect(next.units[unit].eq(state.units[unit].add(1))).toBe(true);
    expect(next.bought[unit].eq(1)).toBe(true);
  });

  it('verändert nur Nahrung, die gekaufte Einheit und ihren Zähler', () => {
    const state = stateWith(100);
    const next = apply(state, { type: 'buy', unit: 'drones' }, BALANCE_V1);
    expect(next.units.queens).toBe(state.units.queens);
    expect(next.units.soldiers).toBe(state.units.soldiers);
    expect(next.bought.queens).toBe(state.bought.queens);
    expect(next.bought.soldiers).toBe(state.bought.soldiers);
    expect(next.res.dna).toBe(state.res.dna);
    expect(next.site).toBe(state.site);
    expect(next.time).toBe(state.time);
    expect(next.rngState).toBe(state.rngState);
  });

  it('verändert die Eingabe nicht', () => {
    const state = stateWith(100);
    const before = JSON.stringify(state);
    const next = apply(state, { type: 'buy', unit: 'soldiers' }, BALANCE_V1);
    expect(next).not.toBe(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('erhöht mit jedem Kauf den Preis', () => {
    const first = apply(stateWith(100), { type: 'buy', unit: 'drones' }, BALANCE_V1);
    expect(priceOf('drones', first).eq(10.7)).toBe(true);
    expect(priceOf('soldiers', first).eq(25)).toBe(true);

    const second = apply(first, { type: 'buy', unit: 'drones' }, BALANCE_V1);
    expect(second.res.food.toNumber()).toBeCloseTo(79.3, 10);
    expect(second.bought.drones.eq(2)).toBe(true);
    expect(priceOf('drones', second).gt(priceOf('drones', first))).toBe(true);
  });

  it('erhöht den Preis nicht durch Einheiten ohne Kauf', () => {
    const state = { ...stateWith(100), units: { ...initial.units, drones: Num.from(50) } };
    expect(priceOf('drones', state).eq(10)).toBe(true);
    expect(apply(state, { type: 'buy', unit: 'drones' }, BALANCE_V1).res.food.eq(90)).toBe(true);
  });

  it.each(UNIT_TYPES)('gibt bei zu wenig Nahrung für %s denselben Zustand zurück', (unit) => {
    const state = stateWith(priceOf(unit, stateWith(0)).sub(0.01));
    expect(apply(state, { type: 'buy', unit }, BALANCE_V1)).toBe(state);
  });

  it('kauft nicht, wenn nur ein Rundungsrest fehlt', () => {
    const state = stateWith(Num.from(10).mul(1 - 1e-12));
    expect(apply(state, { type: 'buy', unit: 'drones' }, BALANCE_V1)).toBe(state);
  });

  it('kauft trotz vollem Platz', () => {
    const state = { ...stateWith(100), units: { ...initial.units, drones: Num.from(1000) } };
    expect(apply(state, { type: 'buy', unit: 'drones' }, BALANCE_V1).units.drones.eq(1001)).toBe(
      true,
    );
  });

  describe.each(UNIT_TYPES)('Grenze Nahrung = Preis für %s', (unit) => {
    it.each([0, 1, 2, 3, 5, 7, 10, 20, 37, 100])('endet bei n = %d exakt auf 0', (n) => {
      const price = priceOf(unit, stateWith(0, n));
      const next = apply(stateWith(price, n), { type: 'buy', unit }, BALANCE_V1);
      expect(next.res.food).toBe(Num.ZERO);
      expect(next.bought[unit].eq(n + 1)).toBe(true);
    });
  });

  it('hält die Nahrung über viele Käufe nicht negativ', () => {
    let state = stateWith(1e6);
    for (let i = 0; i < 300; i++) {
      state = apply(state, { type: 'buy', unit: UNIT_TYPES[i % UNIT_TYPES.length] }, BALANCE_V1);
      expect(state.res.food.isNegative()).toBe(false);
    }
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, droneCost: 4, droneCostGrowth: 2 };
    const first = apply(stateWith(10), { type: 'buy', unit: 'drones' }, params);
    expect(first.res.food.eq(6)).toBe(true);
    // Der zweite Kauf kostet 8 und ist mit 6 Nahrung nicht mehr möglich.
    expect(apply(first, { type: 'buy', unit: 'drones' }, params)).toBe(first);
  });

  it('erlaubt den Preis 0 ohne Nahrungsverlust', () => {
    const params = { ...BALANCE_V1, droneCost: 0 };
    const next = apply(stateWith(5), { type: 'buy', unit: 'drones' }, params);
    expect(next.res.food.eq(5)).toBe(true);
    expect(next.units.drones.eq(1)).toBe(true);
  });

  it('gibt bei negativem Preis denselben Zustand zurück', () => {
    const state = stateWith(5);
    const params = { ...BALANCE_V1, droneCost: -1 };
    expect(apply(state, { type: 'buy', unit: 'drones' }, params)).toBe(state);
  });
});

describe('canBuy', () => {
  it('entspricht dem Startzustand: Drohne ja, Soldat und Königin nein', () => {
    expect(canBuy(initial, 'drones', BALANCE_V1)).toBe(true);
    expect(canBuy(initial, 'soldiers', BALANCE_V1)).toBe(false);
    expect(canBuy(initial, 'queens', BALANCE_V1)).toBe(false);
  });

  it('gilt genau ab dem Preis', () => {
    expect(canBuy(stateWith(10), 'drones', BALANCE_V1)).toBe(true);
    expect(canBuy(stateWith(9.99), 'drones', BALANCE_V1)).toBe(false);
  });

  it('nutzt überschriebene Parameter', () => {
    expect(canBuy(stateWith(5), 'drones', { ...BALANCE_V1, droneCost: 5 })).toBe(true);
  });

  it.each(UNIT_TYPES)('stimmt für %s mit dem Kommando überein', (unit) => {
    for (const food of [0, 9.99, 10, 25, 60, 1000]) {
      const state = stateWith(food);
      expect(apply(state, { type: 'buy', unit }, BALANCE_V1) !== state).toBe(
        canBuy(state, unit, BALANCE_V1),
      );
    }
  });
});
