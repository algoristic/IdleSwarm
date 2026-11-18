import type { UnitType } from '../../data/units';
import { assertPositiveInterval, Bot, CommandPlan, nextMultipleMs } from './bot';

export const IDLE_VISIT_EVERY_MS = 5 * 60_000;

/** Kaufreihenfolge beim Vorbeischauen: Königin vor Drohne; Soldaten nützen in M1.1 nichts. */
const BUY_ORDER: readonly UnitType[] = ['queens', 'drones'];

export interface IdleBotOptions {
  readonly visitEveryMs?: number;
}

/** Klickt nie, schaut regelmäßig vorbei und kauft dann alles Bezahlbare. */
export function createIdleBot({ visitEveryMs = IDLE_VISIT_EVERY_MS }: IdleBotOptions = {}): Bot {
  assertPositiveInterval('createIdleBot', visitEveryMs);
  return {
    name: 'idle',
    nextActionMs: (afterMs) => nextMultipleMs(afterMs, visitEveryMs),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      plan.renewEmptySite();
      for (const unit of BUY_ORDER) {
        while (plan.canBuy(unit)) {
          plan.buy(unit);
        }
      }
      return plan.commands;
    },
  };
}
