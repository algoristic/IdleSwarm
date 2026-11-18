import { DEFAULT_BALANCE, TICK_MS } from '../balance/constants';
import { Num } from '../num/num';
import { createInitialState, GameState } from '../state/game-state';
import { applyBrood } from './brood';

interface Setup {
  readonly queens?: number;
  readonly drones?: number;
  readonly soldiers?: number;
  readonly food: number;
}

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function createState({ queens = 1, drones = 0, soldiers = 0, food }: Setup): GameState {
  const base = createInitialState({ seed: 'brut', now: 0 });
  return deepFreeze({
    ...base,
    res: { ...base.res, food: Num.from(food) },
    units: {
      queens: Num.from(queens),
      drones: Num.from(drones),
      soldiers: Num.from(soldiers),
    },
  });
}

describe('applyBrood', () => {
  it('rechnet den Brut-Teil von Beispiel 1 aus Game-Design §4.3', () => {
    const input = createState({ drones: 10, food: 5.2 });
    const { units, res } = applyBrood(input, TICK_MS, DEFAULT_BALANCE);
    expect(units.drones.eq(10.0075)).toBe(true);
    expect(units.soldiers.eq(0.0025)).toBe(true);
    expect(res.food.eq(5.0625)).toBe(true);
  });

  it('rechnet Beispiel 2 aus Game-Design §4.3 und leert die Nahrung exakt', () => {
    const input = createState({ food: 0.05 });
    const { units, res } = applyBrood(input, TICK_MS, DEFAULT_BALANCE);
    expect(units.drones.toNumber()).toBeCloseTo(0.00272727, 8);
    expect(units.soldiers.toNumber()).toBeCloseTo(0.00090909, 8);
    expect(res.food.isZero()).toBe(true);
  });

  it('brütet mit einer Königin 6 Eier je Minute aus', () => {
    let state = createState({ food: 1000 });
    for (let i = 0; i < 600; i++) {
      state = applyBrood(state, TICK_MS, DEFAULT_BALANCE);
    }
    expect(state.units.drones.toNumber()).toBeCloseTo(4.5, 9);
    expect(state.units.soldiers.toNumber()).toBeCloseTo(1.5, 9);
    expect(state.res.food.toNumber()).toBeCloseTo(1000 - 6 * 13.75, 9);
  });

  it('rechnet einen großen Schritt wie die Rate vorgibt', () => {
    const { units } = applyBrood(createState({ food: 1000 }), 60_000, DEFAULT_BALANCE);
    expect(units.drones.eq(4.5)).toBe(true);
    expect(units.soldiers.eq(1.5)).toBe(true);
  });

  it('begrenzt auch große Schritte auf die Nahrung', () => {
    const { units, res } = applyBrood(createState({ food: 27.5 }), 3_600_000, DEFAULT_BALANCE);
    expect(units.drones.eq(1.5)).toBe(true);
    expect(units.soldiers.eq(0.5)).toBe(true);
    expect(res.food.isZero()).toBe(true);
  });

  it('wird nie negativ, auch nicht bei Nahrung nahe den Schrittkosten', () => {
    for (let i = -50; i <= 50; i++) {
      const food = 0.1375 * (1 + i * 1e-15);
      const { res } = applyBrood(createState({ food }), TICK_MS, DEFAULT_BALANCE);
      expect(res.food.isNegative()).toBe(false);
    }
  });

  it('pausiert ohne Nahrung und gibt denselben Zustand zurück', () => {
    const input = createState({ drones: 3, food: 0 });
    expect(applyBrood(input, TICK_MS, DEFAULT_BALANCE)).toBe(input);
  });

  it('gibt ohne Königinnen denselben Zustand zurück', () => {
    const input = createState({ queens: 0, food: 100 });
    expect(applyBrood(input, TICK_MS, DEFAULT_BALANCE)).toBe(input);
  });

  it('ändert Königinnen, Kaufzähler, Vorrat und DNA nicht', () => {
    const input = createState({ queens: 2, food: 100 });
    const state = applyBrood(input, TICK_MS, DEFAULT_BALANCE);
    expect(state.units.queens).toBe(input.units.queens);
    expect(state.bought).toBe(input.bought);
    expect(state.site).toBe(input.site);
    expect(state.res.dna).toBe(input.res.dna);
  });

  it('verändert die eingefrorene Eingabe nicht', () => {
    const input = createState({ food: 100 });
    const before = JSON.stringify(input);
    expect(applyBrood(input, TICK_MS, DEFAULT_BALANCE)).not.toBe(input);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('brütet bei Kosten von 0 auch ohne Nahrung', () => {
    const params = { ...DEFAULT_BALANCE, droneCost: 0, soldierCost: 0 };
    const { units, res } = applyBrood(createState({ food: 0 }), 1000, params);
    expect(units.drones.eq(0.075)).toBe(true);
    expect(units.soldiers.eq(0.025)).toBe(true);
    expect(res.food.isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = {
      ...DEFAULT_BALANCE,
      queenEggsPerMin: 60,
      broodDroneShare: 0.5,
      droneCost: 2,
      soldierCost: 4,
    };
    const { units, res } = applyBrood(createState({ queens: 2, food: 10 }), 1000, params);
    expect(units.drones.eq(1)).toBe(true);
    expect(units.soldiers.eq(1)).toBe(true);
    expect(res.food.eq(4)).toBe(true);
  });
});
