import {
  assertPositiveInterval,
  Bot,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';
import { MS_PER_MINUTE } from '@app/shared/util/time/time-units';

import {
  ACTIVE_BRANCHES,
  ACTIVE_DRONE_SHARE,
  buyOption,
  canBuyOption,
  FoodOption,
} from './active-bot-logic';
import { evolveGenome } from './genome-bot-logic';
import { distributePheromones } from './pheromone-bot-logic';

export const IDLE_VISIT_EVERY_MS = 5 * MS_PER_MINUTE;

/**
 * Kaufreihenfolge beim Vorbeischauen: Königin, Drüsenpunkt, Drohne (Game-Design §6.3); Soldaten kauft
 * er nicht.
 */
const BUY_ORDER: readonly FoodOption[] = ['queens', 'gland', 'drones'];

export interface IdleBotOptions {
  readonly visitEveryMs?: number;
}

/**
 * Schaut regelmäßig vorbei, entwickelt das Genom wie „Aktiv“, kauft alles Bezahlbare und verteilt
 * freie Pheromonpunkte (Game-Design §6.3).
 */
export function createIdleBot({ visitEveryMs = IDLE_VISIT_EVERY_MS }: IdleBotOptions = {}): Bot {
  assertPositiveInterval('createIdleBot', visitEveryMs);
  return {
    name: 'idle',
    nextActionMs: (afterMs) => nextMultipleMs(afterMs, visitEveryMs),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      plan.enableAutoMove();
      evolveGenome(plan, ACTIVE_BRANCHES);
      for (const option of BUY_ORDER) {
        while (canBuyOption(plan, option)) {
          buyOption(plan, option);
        }
      }
      distributePheromones(plan, ACTIVE_DRONE_SHARE);
      return plan.commands;
    },
  };
}
