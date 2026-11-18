import { BalanceParams, DEFAULT_BALANCE } from '../balance/constants';
import { unitPrice } from '../balance/formulas';
import type { UnitType } from '../data/units';
import { Num } from '../num/num';
import type { GameState, Units } from '../state/game-state';

function incremented(counts: Units, unit: UnitType): Units {
  return { ...counts, [unit]: counts[unit].add(Num.ONE) };
}

/** Prüft `N ≥ Preis` (Game-Design §4.2); ein negativer Preis aus `params` ist nie kaufbar. */
export function canBuy(
  state: GameState,
  unit: UnitType,
  params: BalanceParams = DEFAULT_BALANCE,
): boolean {
  const price = unitPrice(unit, state.bought, params);
  return !price.isNegative() && state.res.food.gte(price);
}

/** Kauft genau eine Einheit zum aktuellen Preis; Platz begrenzt den Kauf nicht (Game-Design §4.2). */
export function buyUnit(state: GameState, unit: UnitType, params: BalanceParams): GameState {
  if (!canBuy(state, unit, params)) {
    return state;
  }
  const { res, units, bought } = state;
  // `sub` rundet; die Untergrenze hält die Nahrung auch dann nicht negativ.
  const food = res.food.sub(unitPrice(unit, bought, params)).max(Num.ZERO);
  return {
    ...state,
    res: { ...res, food },
    units: incremented(units, unit),
    bought: incremented(bought, unit),
  };
}
