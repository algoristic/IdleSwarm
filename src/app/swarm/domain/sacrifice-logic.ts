import type { BalanceParams } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { dronesPerQueen, sacrificeFood } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

/**
 * Opfert `count` Drohnen für `n · η · c_d` Nahrung (Game-Design §4.10), auch während einer Reise.
 * `count` wird auf die vorhandenen Drohnen begrenzt, `Infinity` opfert alle; Bruchteile sind erlaubt.
 * Ohne Wirkung (keine Drohnen, `count` nicht positiv oder `NaN`) kommt derselbe Zustand zurück.
 */
export function sacrificeDrones(
  state: GameState,
  count: number,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): GameState {
  const { res, units } = state;
  if (!(count > 0) || !units.drones.gt(Num.ZERO)) {
    return state;
  }
  const sacrificed = Number.isFinite(count) ? units.drones.min(count) : units.drones;
  // Wer alle opfert, behält exakt 0 Drohnen, unabhängig von der Rechnung in `sub`.
  const drones = sacrificed.eq(units.drones)
    ? Num.ZERO
    : units.drones.sub(sacrificed).max(Num.ZERO);
  return {
    ...state,
    res: { ...res, food: res.food.add(sacrificeFood(sacrificed, params, modifiers).max(Num.ZERO)) },
    units: { ...units, drones },
  };
}

/**
 * Drohnen, die die nächste Königin kostet (`k_q`, Game-Design §4.10); `null`, wenn keine Umwandlung
 * möglich ist (kein positiver Drohnenwert oder negativer Königinnenpreis aus `params`).
 */
export function queenPriceInDrones(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num | null {
  const price = dronesPerQueen(state.bought, params, modifiers);
  return price && !price.isNegative() ? price : null;
}

/** Prüft `D ≥ k_q` (Game-Design §4.10). */
export function canConvertDronesToQueen(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): boolean {
  const price = queenPriceInDrones(state, params, modifiers);
  return price !== null && state.units.drones.gte(price);
}

/**
 * Wandelt `k_q` Drohnen in eine Königin um; zählt als Kauf (`bought.queens + 1`, Game-Design §4.10).
 * Reichen die Drohnen nicht, kommt derselbe Zustand zurück.
 */
export function convertDronesToQueen(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): GameState {
  const price = queenPriceInDrones(state, params, modifiers);
  const { units, bought } = state;
  if (price === null || units.drones.lt(price)) {
    return state;
  }
  return {
    ...state,
    units: {
      ...units,
      queens: units.queens.add(Num.ONE),
      drones: units.drones.sub(price).max(Num.ZERO),
    },
    bought: { ...bought, queens: bought.queens.add(Num.ONE) },
  };
}
