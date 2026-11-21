import type { BalanceParams } from '@app/balance/domain/constants';
import { isAffordable, unitPrice } from '@app/balance/domain/formulas';
import { availableNodeCount } from '@app/genome/domain/genome-logic';
import { UNIT_TYPES } from '@app/swarm/domain/models/units.model';
import { canStrengthenGland } from '@app/swarm/domain/pheromone-logic';

import type { UnitPrices } from './bot-logic';
import type { GameState } from './models/game-state.model';

/**
 * Ist irgendein Kauf sofort bezahlbar (Kauf-Definition aus M1.3): eine Einheit, ein Drüsenpunkt oder
 * eine Adaption (regulärer Genom-Knoten mit Status `available`). Gewartet wird nur, solange nichts
 * davon bezahlbar ist (entschieden mit M1.5, PO). `prices` übergibt der Runner aus seinem Preis-Cache.
 */
export function isAnyPurchaseAffordable(
  state: GameState,
  params: BalanceParams,
  prices?: UnitPrices,
): boolean {
  const food = state.res.food;
  return (
    UNIT_TYPES.some((unit) =>
      isAffordable(prices?.[unit] ?? unitPrice(unit, state.bought, params), food),
    ) ||
    canStrengthenGland(state, params) ||
    availableNodeCount(state, params) > 0
  );
}
