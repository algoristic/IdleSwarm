import {
  broodFoodPerSecond,
  meanBroodCost,
  secondsUntilAffordable,
} from '@app/balance/domain/formulas';
import {
  assertPositiveInterval,
  Bot,
  BotView,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';
import { Num } from '@app/shared/util/num/num';
import type { UnitType } from '@app/swarm/domain/models/units.model';

export const ACTIVE_DECIDE_EVERY_MS = 1000;

const SECONDS_PER_MINUTE = 60;

const ONE_QUEEN = { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.ZERO };

export interface ActiveBotOptions {
  readonly decideEveryMs?: number;
}

/**
 * Zusätzlicher Ertrag einer Königin in Nahrung/s: Je Ei spart sie den Kauf von `a` Drohnen zum
 * aktuellen Preis und kostet dafür `c̄`. Ohne Zufluss für ihre Brut bringt sie nichts.
 */
function queenGainPerSecond(view: BotView, income: Num): Num {
  const { params, prices } = view;
  const value = prices.drones.mul(params.broodDroneShare).sub(meanBroodCost(params));
  const fundable = income.sub(broodFoodPerSecond(ONE_QUEEN, params)).gt(Num.ZERO);
  return fundable && value.gt(Num.ZERO)
    ? value.mul(params.queenEggsPerMin / SECONDS_PER_MINUTE)
    : Num.ZERO;
}

/**
 * Amortisation `Preis / Ertrag` in Sekunden; unerreichbare Käufe zählen als unendlich. Die Wartezeit
 * fließt bewusst nicht ein: Jeder Drohnenkauf würde sonst die Königin weiter wegrücken und so weitere
 * Drohnenkäufe auslösen.
 */
function paybackSeconds(price: Num, food: Num, income: Num, gainPerSecond: Num): number {
  if (secondsUntilAffordable(price, food, income) === null || !gainPerSecond.gt(Num.ZERO)) {
    return Infinity;
  }
  return price.div(gainPerSecond).toNumber();
}

/** Spart bewusst: Ist die beste Einheit noch zu teuer, wird nichts Schlechteres gekauft. */
function bestUnit(plan: CommandPlan): UnitType | null {
  const { view, state } = plan;
  const { prices, params } = view;
  const food = state.res.food;
  const income = view.netFoodPerSecond;
  const drones = paybackSeconds(prices.drones, food, income, Num.from(params.droneCollectRate));
  const queens = paybackSeconds(prices.queens, food, income, queenGainPerSecond(view, income));
  if (drones === Infinity && queens === Infinity) {
    return null;
  }
  return queens < drones ? 'queens' : 'drones';
}

/** Kauft Königinnen und Drohnen, jeweils die Einheit mit der kürzesten Amortisation. */
export function buyByPayback(plan: CommandPlan): void {
  // Ohne bezahlbare Einheit steht das Ergebnis fest; das spart die Bewertung.
  while (plan.canBuy('drones') || plan.canBuy('queens')) {
    const unit = bestUnit(plan);
    if (unit === null || !plan.canBuy(unit)) {
      break;
    }
    plan.buy(unit);
  }
}

/** Entscheidet regelmäßig und kauft die Einheit mit der kürzesten Amortisation. */
export function createActiveBot({
  decideEveryMs = ACTIVE_DECIDE_EVERY_MS,
}: ActiveBotOptions = {}): Bot {
  assertPositiveInterval('createActiveBot', decideEveryMs);
  return {
    name: 'active',
    nextActionMs: (afterMs) => nextMultipleMs(afterMs, decideEveryMs),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      // Weiterziehen übernimmt das Auto-Weiterziehen (Game-Design §4.12).
      plan.enableAutoMove();
      buyByPayback(plan);
      return plan.commands;
    },
  };
}
