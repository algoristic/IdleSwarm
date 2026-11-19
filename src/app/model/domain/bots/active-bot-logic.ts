import {
  broodFoodPerSecond,
  collectRatePerDrone,
  distributedPheromonePoints,
  meanBroodCost,
  pheromoneDroneShare,
  queenEggsPerMinute,
  secondsUntilAffordable,
} from '@app/balance/domain/formulas';
import {
  assertPositiveInterval,
  Bot,
  BotView,
  CommandPlan,
  nextMultipleMs,
} from '@app/engine/domain/bot-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND, SECONDS_PER_MINUTE } from '@app/shared/util/time/time-units';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import { BranchPreference, evolveGenome } from './genome-bot-logic';
import { distributePheromones } from './pheromone-bot-logic';

export const ACTIVE_DECIDE_EVERY_MS = MS_PER_SECOND;

/** Zielanteil `a*` und bevorzugte Äste von „Aktiv“ und „Idle“ (Game-Design §6.3). */
export const ACTIVE_DRONE_SHARE = 3 / 4;
export const ACTIVE_BRANCHES: BranchPreference = ['collect', 'brood', 'combat'];

const ONE_QUEEN = { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.ZERO };

export interface ActiveBotOptions {
  readonly decideEveryMs?: number;
}

/**
 * Zusätzlicher Ertrag einer Königin in Nahrung/s: Je Ei spart sie den Kauf von `a` Drohnen zum
 * aktuellen Preis und kostet dafür `c̄`; `a` folgt aus der Pheromon-Verteilung des Zustands. Ohne
 * Zufluss für ihre Brut bringt sie nichts.
 */
function queenGainPerSecond(view: BotView, pheromones: Pheromones, income: Num): Num {
  const { params, prices, modifiers } = view;
  const value = prices.drones
    .mul(pheromoneDroneShare(pheromones))
    .sub(meanBroodCost(pheromones, params));
  const fundable = income
    .sub(broodFoodPerSecond(ONE_QUEEN, pheromones, params, modifiers))
    .gt(Num.ZERO);
  return fundable && value.gt(Num.ZERO)
    ? value.mul(queenEggsPerMinute(pheromones, params, modifiers) / SECONDS_PER_MINUTE)
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

/** Kaufoptionen in Nahrung: Einheiten und der Drüsenpunkt (Game-Design §6.3). */
export type FoodOption = UnitType | 'gland';

/**
 * Zusätzlicher Ertrag eines Drüsenpunkts: `Q / P_v` × Ertrag einer weiteren Königin (Game-Design
 * §6.3), denn ein verteilter Punkt bringt `Q · e_q · M_brut / P_0` Eier/min. Ohne verteilte Punkte
 * gibt es keinen Bezug; dann bringt er nichts.
 */
function glandGainPerSecond(state: GameState, queenGain: Num): Num {
  const distributed = distributedPheromonePoints(state.pheromones);
  return distributed > 0 ? queenGain.mul(state.units.queens).div(distributed) : Num.ZERO;
}

/**
 * Spart bewusst: Ist die beste Option noch zu teuer, wird nichts Schlechteres gekauft. Bei gleicher
 * Amortisation gilt Drohne vor Königin vor Drüsenpunkt.
 */
function bestOption(plan: CommandPlan): FoodOption | null {
  const { view, state } = plan;
  const { prices, params, modifiers } = view;
  const food = state.res.food;
  const income = view.netFoodPerSecond;
  const queenGain = queenGainPerSecond(view, state.pheromones, income);
  const options: readonly (readonly [FoodOption, number])[] = [
    [
      'drones',
      paybackSeconds(prices.drones, food, income, Num.from(collectRatePerDrone(params, modifiers))),
    ],
    ['queens', paybackSeconds(prices.queens, food, income, queenGain)],
    ['gland', paybackSeconds(view.glandPrice, food, income, glandGainPerSecond(state, queenGain))],
  ];
  let best: FoodOption | null = null;
  let bestSeconds = Infinity;
  for (const [option, seconds] of options) {
    if (seconds < bestSeconds) {
      best = option;
      bestSeconds = seconds;
    }
  }
  return best;
}

/** Ist die Option jetzt bezahlbar (und die Obergrenze je Entscheidung nicht erreicht)? */
export function canBuyOption(plan: CommandPlan, option: FoodOption): boolean {
  return option === 'gland' ? plan.canStrengthenGland() : plan.canBuy(option);
}

export function buyOption(plan: CommandPlan, option: FoodOption): void {
  if (option === 'gland') {
    plan.strengthenGland();
  } else {
    plan.buy(option);
  }
}

/**
 * Kauft Königinnen, Drohnen und Drüsenpunkte, jeweils die Option mit der kürzesten Amortisation. Die
 * neuen Punkte bleiben frei, bis `distributePheromones` sie verteilt.
 */
export function buyByPayback(plan: CommandPlan): void {
  // Ohne bezahlbare Option steht das Ergebnis fest; das spart die Bewertung.
  while (plan.canBuy('drones') || plan.canBuy('queens') || plan.canStrengthenGland()) {
    const option = bestOption(plan);
    if (option === null || !canBuyOption(plan, option)) {
      break;
    }
    buyOption(plan, option);
  }
}

/**
 * Entscheidet regelmäßig (Game-Design §6.3): entwickelt das Genom, kauft die Option mit der
 * kürzesten Amortisation und verteilt freie Pheromonpunkte.
 */
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
      evolveGenome(plan, ACTIVE_BRANCHES);
      buyByPayback(plan);
      distributePheromones(plan, ACTIVE_DRONE_SHARE);
      return plan.commands;
    },
  };
}
