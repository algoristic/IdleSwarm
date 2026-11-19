import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import {
  canConvertDronesToQueen,
  convertDronesToQueen,
  queenPriceInDrones,
  sacrificeDrones,
} from './sacrifice-logic';

const initial = createInitialState({ seed: 'idleswarm', now: 1000 });

/** Eingefrorener Zustand mit Drohnen, Nahrung und Königinnenkäufen. */
function stateWith(drones: number, food = 0, queensBought = 0): GameState {
  return Object.freeze({
    ...initial,
    res: Object.freeze({ ...initial.res, food: Num.from(food) }),
    units: Object.freeze({ ...initial.units, drones: Num.from(drones) }),
    bought: Object.freeze({ ...initial.bought, queens: Num.from(queensBought) }),
  });
}

describe('sacrificeDrones', () => {
  it('rechnet Beispiel 6: 10 Drohnen ergeben 50 Nahrung', () => {
    const state = stateWith(25, 7);
    const next = sacrificeDrones(state, 10, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next.units.drones.eq(15)).toBe(true);
    expect(next.res.food.eq(57)).toBe(true);
    expect(next.units.queens).toBe(state.units.queens);
    expect(next.bought).toBe(state.bought);
    expect(state.units.drones.eq(25)).toBe(true);
  });

  it('erlaubt Bruchteile', () => {
    const next = sacrificeDrones(stateWith(5), 0.5, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next.units.drones.eq(4.5)).toBe(true);
    expect(next.res.food.eq(2.5)).toBe(true);
  });

  it.each([12, Infinity])('begrenzt %d auf die vorhandenen Drohnen', (count) => {
    const next = sacrificeDrones(stateWith(10.5), count, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next.units.drones.isZero()).toBe(true);
    expect(next.res.food.eq(52.5)).toBe(true);
  });

  it('nutzt die gekappte Ausbeute', () => {
    const next = sacrificeDrones(
      stateWith(10),
      10,
      { ...DEFAULT_BALANCE, sacrificeYield: 2 },
      NEUTRAL_MODIFIERS,
    );
    expect(next.res.food.eq(90)).toBe(true);
  });

  it.each([0, -1, NaN, -Infinity])('bleibt bei %d ohne Wirkung', (count) => {
    const state = stateWith(10);
    expect(sacrificeDrones(state, count, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(state);
  });

  it('bleibt ohne Drohnen ohne Wirkung', () => {
    const state = stateWith(0);
    expect(sacrificeDrones(state, 5, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(state);
  });

  it('wirkt auch während einer Reise', () => {
    const traveling = Object.freeze({
      ...stateWith(10),
      travel: { target: initial.map.candidates[0], remainingMs: 1000 },
    });
    expect(sacrificeDrones(traveling, 10, DEFAULT_BALANCE, NEUTRAL_MODIFIERS).res.food.eq(50)).toBe(
      true,
    );
  });
});

describe('convertDronesToQueen', () => {
  it('kostet beim Start 12 Drohnen und zählt als Kauf', () => {
    const state = stateWith(20, 3);
    expect(queenPriceInDrones(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)?.toNumber()).toBeCloseTo(
      12,
      12,
    );
    expect(canConvertDronesToQueen(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(true);
    const next = convertDronesToQueen(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next.units.queens.eq(2)).toBe(true);
    expect(next.units.drones.toNumber()).toBeCloseTo(8, 12);
    expect(next.bought.queens.eq(1)).toBe(true);
    expect(next.res).toBe(state.res);
    expect(state.units.queens.eq(1)).toBe(true);
  });

  it('kostet nach fünf Königinnenkäufen ≈ 29,86 Drohnen', () => {
    const state = stateWith(30, 0, 5);
    expect(queenPriceInDrones(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)?.toNumber()).toBeCloseTo(
      29.86,
      2,
    );
    const next = convertDronesToQueen(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next.units.drones.toNumber()).toBeCloseTo(0.14, 2);
    expect(next.bought.queens.eq(6)).toBe(true);
  });

  it('bleibt ohne Wirkung, wenn die Drohnen nicht reichen', () => {
    const state = stateWith(11.99);
    expect(canConvertDronesToQueen(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(false);
    expect(convertDronesToQueen(state, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(state);
  });

  it('bleibt ohne positiven Drohnenwert ohne Wirkung', () => {
    const state = stateWith(1000);
    const params = { ...DEFAULT_BALANCE, droneCost: 0 };
    expect(queenPriceInDrones(state, params, NEUTRAL_MODIFIERS)).toBeNull();
    expect(convertDronesToQueen(state, params, NEUTRAL_MODIFIERS)).toBe(state);
  });
});
