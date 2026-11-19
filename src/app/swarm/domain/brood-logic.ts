import type { BalanceParams } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { broodResult } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';

/**
 * Brut-Teil des Simulationsschritts; Rate und Verhältnis folgen aus den Pheromonen (Game-Design
 * §4.3, §4.15). Ohne geschlüpfte Einheiten kommt derselbe Zustand zurück.
 */
export function applyBrood(
  state: GameState,
  dtMs: number,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): GameState {
  const { res, units, pheromones } = state;
  const brood = broodResult(units, pheromones, res.food, dtMs, params, modifiers);
  if (brood.hatched.isZero()) {
    return state;
  }
  return {
    ...state,
    res: { ...res, food: res.food.sub(brood.foodCost) },
    units: {
      ...units,
      drones: units.drones.add(brood.drones),
      soldiers: units.soldiers.add(brood.soldiers),
    },
  };
}
