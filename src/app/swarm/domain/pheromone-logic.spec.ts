import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { combineEffects } from '@app/balance/domain/effects-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import {
  canSetPheromones,
  canStrengthenGland,
  setPheromones,
  startPheromones,
  strengthenGland,
} from './pheromone-logic';

function createState(food: number, glands = 0): GameState {
  const base = createInitialState({ seed: 'pheromone', now: 0 });
  return Object.freeze({
    ...base,
    res: Object.freeze({ ...base.res, food: Num.from(food) }),
    pheromones: Object.freeze({ ...base.pheromones, glands }),
  });
}

describe('startPheromones', () => {
  it('setzt 3 auf Drohnen, 1 auf Soldaten und keine Drüsenpunkte', () => {
    expect(startPheromones(DEFAULT_BALANCE)).toEqual({ drones: 3, soldiers: 1, glands: 0 });
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...DEFAULT_BALANCE, startPheromoneDrones: 0, startPheromoneSoldiers: 2 };
    expect(startPheromones(params)).toEqual({ drones: 0, soldiers: 2, glands: 0 });
  });
});

describe('setPheromones', () => {
  it('verteilt die Punkte kostenlos neu', () => {
    const state = createState(10);
    const next = setPheromones(state, 1, 3, DEFAULT_BALANCE);
    expect(next.pheromones).toEqual({ drones: 1, soldiers: 3, glands: 0 });
    expect(next.res).toBe(state.res);
    expect(state.pheromones).toEqual({ drones: 3, soldiers: 1, glands: 0 });
  });

  it('erlaubt freie Punkte und das Abziehen aller Punkte', () => {
    const state = createState(10);
    expect(setPheromones(state, 2, 1, DEFAULT_BALANCE).pheromones.drones).toBe(2);
    expect(setPheromones(state, 0, 0, DEFAULT_BALANCE).pheromones).toEqual({
      drones: 0,
      soldiers: 0,
      glands: 0,
    });
  });

  it('nutzt gekaufte Drüsenpunkte und P_bonus aus den Effekten', () => {
    const state = createState(10, 1);
    expect(setPheromones(state, 4, 1, DEFAULT_BALANCE).pheromones.drones).toBe(4);
    expect(setPheromones(state, 5, 1, DEFAULT_BALANCE)).toBe(state);
    const bonus = combineEffects([{ target: 'pheromonePoints', op: 'add', value: 1 }], null);
    expect(setPheromones(state, 5, 1, DEFAULT_BALANCE, bonus).pheromones.drones).toBe(5);
  });

  it.each<[string, number, number]>([
    ['über P_ges', 4, 1],
    ['negativ', -1, 1],
    ['gebrochen', 2.5, 1],
    ['NaN', Number.NaN, 0],
    ['unendlich', Number.POSITIVE_INFINITY, 0],
  ])('bleibt %s ohne Wirkung', (_name, drones, soldiers) => {
    const state = createState(10);
    expect(canSetPheromones(state, drones, soldiers, DEFAULT_BALANCE)).toBe(false);
    expect(setPheromones(state, drones, soldiers, DEFAULT_BALANCE)).toBe(state);
  });

  it('gibt bei unveränderter Verteilung denselben Zustand zurück', () => {
    const state = createState(10);
    expect(setPheromones(state, 3, 1, DEFAULT_BALANCE)).toBe(state);
  });
});

describe('strengthenGland', () => {
  it('kauft einen freien Drüsenpunkt (Beispiel 11)', () => {
    const state = createState(150);
    const next = strengthenGland(state, DEFAULT_BALANCE);
    expect(next.res.food.eq(50)).toBe(true);
    expect(next.pheromones).toEqual({ drones: 3, soldiers: 1, glands: 1 });
  });

  it('verlangt den Preis c_P · w_P^k', () => {
    const state = createState(399, 2);
    expect(canStrengthenGland(state, DEFAULT_BALANCE)).toBe(false);
    expect(strengthenGland(state, DEFAULT_BALANCE)).toBe(state);
    const exact = createState(400, 2);
    const next = strengthenGland(exact, DEFAULT_BALANCE);
    expect(next.res.food.isZero()).toBe(true);
    expect(next.pheromones.glands).toBe(3);
  });

  it('ist bei einem negativen Preis aus params nie bezahlbar', () => {
    const state = createState(1000);
    expect(strengthenGland(state, { ...DEFAULT_BALANCE, glandCost: -1 })).toBe(state);
  });
});
