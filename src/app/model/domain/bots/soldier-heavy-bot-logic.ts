import {
  assertPositiveInterval,
  Bot,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';
import type { Num } from '@app/shared/util/num/num';

import {
  ACTIVE_DECIDE_EVERY_MS,
  ActiveBotOptions,
  buyOption,
  canBuyOption,
  FoodOption,
} from './active-bot-logic';
import { BranchPreference, evolveGenome } from './genome-bot-logic';
import { distributePheromones } from './pheromone-bot-logic';

/**
 * Zielanteil `a*` und bevorzugte Äste; Sammeln zuletzt (Game-Design §6.3). Mit `a* = 1/4` hätte er
 * kaum Einkommen, denn Drohnen kommen nur aus der Brut.
 */
const SOLDIER_HEAVY_DRONE_SHARE = 1 / 2;
const SOLDIER_HEAVY_BRANCHES: BranchPreference = ['combat', 'brood'];

/**
 * Kauft von Soldat, Königin und Drüsenpunkt den günstigsten, bei Gleichstand Soldat vor Königin vor
 * Drüsenpunkt. Drohnen kauft er nicht, sie kommen aus der Brut. Spart wie „Aktiv“: Ist der günstigste
 * noch zu teuer, wird nichts gekauft.
 */
function cheapestOption(plan: CommandPlan): FoodOption {
  const { prices, glandPrice } = plan.view;
  const options: readonly (readonly [FoodOption, Num])[] = [
    ['soldiers', prices.soldiers],
    ['queens', prices.queens],
    ['gland', glandPrice],
  ];
  let [best, bestPrice] = options[0];
  for (const [option, price] of options.slice(1)) {
    if (price.lt(bestPrice)) {
      best = option;
      bestPrice = price;
    }
  }
  return best;
}

/**
 * Soldaten-lastig (US-10.04): kauft bevorzugt Soldaten, dazu Königinnen und Drüsenpunkte, verteilt
 * die Pheromonpunkte halb auf Soldaten, nimmt Soldaten zuerst mit und zieht nach „Kampfgehärtet“
 * weiter.
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
      evolveGenome(plan, SOLDIER_HEAVY_BRANCHES);
      for (
        let option = cheapestOption(plan);
        canBuyOption(plan, option);
        option = cheapestOption(plan)
      ) {
        buyOption(plan, option);
      }
      distributePheromones(plan, SOLDIER_HEAVY_DRONE_SHARE);
      return plan.commands;
    },
  };
}
