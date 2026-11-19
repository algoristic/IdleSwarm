import {
  assertPositiveInterval,
  Bot,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';

import { ACTIVE_DECIDE_EVERY_MS, ActiveBotOptions, buyByPayback } from './active-bot-logic';
import { BranchPreference, evolveGenome } from './genome-bot-logic';
import { distributePheromones } from './pheromone-bot-logic';

/** Zielanteil `a*` und bevorzugte Äste; Kampf zuletzt (Game-Design §6.3). */
const DRONE_HEAVY_DRONE_SHARE = 1;
const DRONE_HEAVY_BRANCHES: BranchPreference = ['collect', 'brood'];

/**
 * Drohnen-lastig (US-10.04): kauft wie „Aktiv“ Königinnen, Drohnen und Drüsenpunkte, verteilt alle
 * Pheromonpunkte auf Drohnen, nimmt Drohnen zuerst mit und zieht nach „Geringster Widerstand“ weiter.
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
      evolveGenome(plan, DRONE_HEAVY_BRANCHES);
      buyByPayback(plan);
      distributePheromones(plan, DRONE_HEAVY_DRONE_SHARE);
      return plan.commands;
    },
  };
}
