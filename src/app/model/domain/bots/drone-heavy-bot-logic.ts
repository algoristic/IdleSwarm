import {
  assertPositiveInterval,
  Bot,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';

import { ACTIVE_DECIDE_EVERY_MS, ActiveBotOptions, buyByPayback } from './active-bot-logic';

/**
 * Drohnen-lastig (US-10.04): kauft wie „Aktiv“ nur Königinnen und Drohnen, nimmt Drohnen zuerst mit
 * und zieht nach „Geringster Widerstand“ weiter.
 */
export function createDroneHeavyBot({
  decideEveryMs = ACTIVE_DECIDE_EVERY_MS,
}: ActiveBotOptions = {}): Bot {
  assertPositiveInterval('createDroneHeavyBot', decideEveryMs);
  return {
    name: 'drone-heavy',
    nextActionMs: (afterMs) => nextMultipleMs(afterMs, decideEveryMs),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      plan.setTransportPriority('drones-first');
      plan.setStrategy('least-resistance');
      plan.enableAutoMove();
      buyByPayback(plan);
      return plan.commands;
    },
  };
}
