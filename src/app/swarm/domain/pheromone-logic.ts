import type { BalanceParams } from '@app/balance/domain/constants';
import { glandPrice, isAffordable, totalPheromonePoints } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import type { Pheromones } from './models/pheromones.model';

/** Verteilung eines neuen Spiels: `P_d0`, `P_s0`, keine gekauften Drüsenpunkte (Game-Design §2.1). */
export function startPheromones(params: BalanceParams): Pheromones {
  return {
    drones: params.startPheromoneDrones,
    soldiers: params.startPheromoneSoldiers,
    glands: 0,
  };
}

function isPointCount(value: number): boolean {
  return Number.isInteger(value) && value >= 0;
}

/**
 * Prüft die Bedingungen von `setPheromones` (Game-Design §4.15): ganze Zahlen ≥ 0 und
 * `drones + soldiers ≤ P_ges`.
 */
export function canSetPheromones(
  state: GameState,
  drones: number,
  soldiers: number,
  params: BalanceParams,
  modifiers: Modifiers,
): boolean {
  return (
    isPointCount(drones) &&
    isPointCount(soldiers) &&
    drones + soldiers <= totalPheromonePoints(state.pheromones, params, modifiers)
  );
}

/**
 * Verteilt die Pheromonpunkte neu (Game-Design §4.15): kostenlos, auch während einer Reise. Ist eine
 * Bedingung verletzt oder ändert sich nichts, kommt derselbe Zustand zurück.
 */
export function setPheromones(
  state: GameState,
  drones: number,
  soldiers: number,
  params: BalanceParams,
  modifiers: Modifiers,
): GameState {
  const { pheromones } = state;
  if (
    !canSetPheromones(state, drones, soldiers, params, modifiers) ||
    (pheromones.drones === drones && pheromones.soldiers === soldiers)
  ) {
    return state;
  }
  return { ...state, pheromones: { ...pheromones, drones, soldiers } };
}

/** Prüft `N ≥ Preis_P` (Game-Design §4.15); ein negativer Preis aus `params` ist nie bezahlbar. */
export function canStrengthenGland(state: GameState, params: BalanceParams): boolean {
  return isAffordable(glandPrice(state.pheromones, params), state.res.food);
}

/**
 * Kauft einen Drüsenpunkt (Game-Design §4.15): `N −= Preis_P`, `k += 1`; der neue Punkt ist frei.
 * Ohne genug Nahrung kommt derselbe Zustand zurück.
 */
export function strengthenGland(state: GameState, params: BalanceParams): GameState {
  if (!canStrengthenGland(state, params)) {
    return state;
  }
  const { res, pheromones } = state;
  // `sub` rundet; die Untergrenze hält die Nahrung auch dann nicht negativ.
  const food = res.food.sub(glandPrice(pheromones, params)).max(Num.ZERO);
  return {
    ...state,
    res: { ...res, food },
    pheromones: { ...pheromones, glands: pheromones.glands + 1 },
  };
}
