import type { BalanceParams } from '@app/balance/domain/constants';
import { broodResult } from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';

/** Brut-Teil des Simulationsschritts; ohne geschlüpfte Einheiten kommt derselbe Zustand zurück. */
export function applyBrood(state: GameState, dtMs: number, params: BalanceParams): GameState {
  const { res, units } = state;
  const brood = broodResult(units, res.food, dtMs, params);
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
