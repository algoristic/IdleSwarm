import { broodFoodPerSecond, meanBroodCost, secondsUntilAffordable } from '../../balance/formulas';
import type { UnitType } from '../../data/units';
import { Num } from '../../num/num';
import { assertPositiveInterval, Bot, BotView, CommandPlan, nextMultipleMs } from './bot';

export const ACTIVE_CLICKS_PER_SECOND = 3;
export const ACTIVE_DECIDE_EVERY_MS = 1000;

/** Mehr als ein Klick je Millisekunde lässt sich auf dem Zeitraster nicht abbilden. */
const MAX_CLICKS_PER_SECOND = 1000;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

const ONE_QUEEN = { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.ZERO };

export interface ActiveBotOptions {
  readonly clicksPerSecond?: number;
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

/** Klickt gleichmäßig, entscheidet regelmäßig und kauft die Einheit mit der kürzesten Amortisation. */
export function createActiveBot({
  clicksPerSecond = ACTIVE_CLICKS_PER_SECOND,
  decideEveryMs = ACTIVE_DECIDE_EVERY_MS,
}: ActiveBotOptions = {}): Bot {
  assertPositiveInterval('createActiveBot', decideEveryMs);
  if (
    !Number.isFinite(clicksPerSecond) ||
    clicksPerSecond < 0 ||
    clicksPerSecond > MAX_CLICKS_PER_SECOND
  ) {
    throw new RangeError(`createActiveBot: ungültige Klickrate ${clicksPerSecond}`);
  }

  // Klick `k` liegt auf ganzen Millisekunden; der erste folgt nach einem vollen Abstand.
  const clickTimeMs = (index: number): number =>
    Math.round((index * MS_PER_SECOND) / clicksPerSecond);

  const isClickTime = (timeMs: number): boolean => {
    if (clicksPerSecond === 0) {
      return false;
    }
    const index = Math.round((timeMs * clicksPerSecond) / MS_PER_SECOND);
    return index > 0 && clickTimeMs(index) === timeMs;
  };

  const nextClickMs = (afterMs: number): number => {
    if (clicksPerSecond === 0) {
      return Infinity;
    }
    let index = Math.floor((afterMs * clicksPerSecond) / MS_PER_SECOND);
    while (clickTimeMs(index) <= afterMs) {
      index++;
    }
    return clickTimeMs(index);
  };

  /** Spart bewusst: Ist die beste Einheit noch zu teuer, wird nichts Schlechteres gekauft. */
  const bestUnit = (plan: CommandPlan): UnitType | null => {
    const { view, state } = plan;
    const { prices, params } = view;
    const food = state.res.food;
    const income = view.netFoodPerSecond.add(clicksPerSecond);
    const drones = paybackSeconds(prices.drones, food, income, Num.from(params.droneCollectRate));
    const queens = paybackSeconds(prices.queens, food, income, queenGainPerSecond(view, income));
    if (drones === Infinity && queens === Infinity) {
      return null;
    }
    return queens < drones ? 'queens' : 'drones';
  };

  return {
    name: 'active',
    nextActionMs: (afterMs) =>
      Math.min(nextClickMs(afterMs), nextMultipleMs(afterMs, decideEveryMs)),
    decide(state, view) {
      const plan = new CommandPlan(state, view);
      const deciding = view.timeMs % decideEveryMs === 0;
      if (isClickTime(view.timeMs)) {
        plan.add({ type: 'click' });
      }
      if (deciding) {
        // Erst nach dem Klick: Er kann den Vorrat leeren, und die Bewertung braucht den Zufluss.
        plan.renewEmptySite();
        // Ohne bezahlbare Einheit steht das Ergebnis fest; das spart die Bewertung.
        while (plan.canBuy('drones') || plan.canBuy('queens')) {
          const unit = bestUnit(plan);
          if (unit === null || !plan.canBuy(unit)) {
            break;
          }
          plan.buy(unit);
        }
      }
      return plan.commands;
    },
  };
}
