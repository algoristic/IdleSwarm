import {
  assertPositiveInterval,
  Bot,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import { ACTIVE_DECIDE_EVERY_MS, ActiveBotOptions } from './active-bot-logic';

/**
 * Kauft von Soldat und Königin die günstigere, bei Gleichstand den Soldaten. Drohnen kauft er nicht,
 * sie kommen aus der Brut. Spart wie „Aktiv“: Ist die günstigere noch zu teuer, wird nichts gekauft.
 */
function cheaperUnit(plan: CommandPlan): UnitType {
  const { prices } = plan.view;
  return prices.queens.lt(prices.soldiers) ? 'queens' : 'soldiers';
}

/**
 * Soldaten-lastig (US-10.04): kauft bevorzugt Soldaten, dazu Königinnen, nimmt Soldaten zuerst mit
 * und zieht nach „Kampfgehärtet“ weiter.
 */
export function createSoldierHeavyBot({
  decideEveryMs = ACTIVE_DECIDE_EVERY_MS,
}: ActiveBotOptions = {}): Bot {
  assertPositiveInterval('createSoldierHeavyBot', decideEveryMs);
  return {
    name: 'soldier-heavy',
    nextActionMs: (afterMs) => nextMultipleMs(afterMs, decideEveryMs),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      plan.setTransportPriority('soldiers-first');
      plan.setStrategy('battle-hardened');
      plan.enableAutoMove();
      for (let unit = cheaperUnit(plan); plan.canBuy(unit); unit = cheaperUnit(plan)) {
        plan.buy(unit);
      }
      return plan.commands;
    },
  };
}
