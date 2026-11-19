import type { BalanceParams } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { swarmRange } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

import { assessTarget, type CombatAssessment } from './combat-logic';
import { candidateInfo } from './map-logic';
import type { StrategyId } from './models/auto-move.model';

/** Einnehmbares Ziel in Reichweite mit den Werten, nach denen die Strategien wählen. */
interface Option {
  readonly index: number;
  readonly distance: number;
  readonly size: Num;
  readonly defense: Num;
  readonly combat: CombatAssessment;
}

/** Negativ, wenn `a` vor `b` kommt; 0 bei Gleichstand. */
type Order = (a: Option, b: Option) => number;

const largerSize: Order = (a, b) => b.size.cmp(a.size);
const fewerLosses: Order = (a, b) => a.combat.losses.cmp(b.combat.losses);
const moreDna: Order = (a, b) => b.combat.dna.cmp(a.combat.dna);
// Gleichstand nach dem Kriterium der Strategie: geringere Distanz, dann kleinerer Index.
const nearer: Order = (a, b) => a.distance - b.distance || a.index - b.index;

function chain(...orders: readonly Order[]): Order {
  return (a, b) => {
    for (const order of orders) {
      const result = order(a, b);
      if (result !== 0) {
        return result;
      }
    }
    return 0;
  };
}

const ORDERS: Readonly<Record<StrategyId, Order>> = {
  'least-resistance': chain(fewerLosses, largerSize, nearer),
  balanced: chain(largerSize, fewerLosses, nearer),
  'battle-hardened': chain(moreDna, largerSize, nearer),
};

const FALLBACK_ORDER = chain(largerSize, nearer);

function options(state: GameState, params: BalanceParams, modifiers: Modifiers): Option[] {
  const { candidates, position } = state.map;
  const range = swarmRange(params, modifiers);
  return candidates.flatMap((candidate, index) => {
    const { distance, status } = candidateInfo(candidate, position, range, params, modifiers);
    if (status !== 'in-range') {
      return [];
    }
    const combat = assessTarget(state, candidate, params, modifiers);
    return combat.capturable
      ? [{ index, distance, size: candidate.size, defense: candidate.defense, combat }]
      : [];
  });
}

function best(list: readonly Option[], order: Order): number | null {
  return list.length === 0 ? null : list.reduce((a, b) => (order(b, a) < 0 ? b : a)).index;
}

/**
 * Ziel der Strategie unter den einnehmbaren Zielen in Reichweite (Game-Design §4.12) als Index in
 * `map.candidates`; `null`, wenn es keines gibt. Findet die Strategie nichts, gilt der Rückfall auf
 * die sichere Futterstelle (Abwehr 0) mit dem größten Vorrat. Prüft nicht, ob eine Reise läuft.
 */
export function strategyTarget(
  state: GameState,
  strategy: StrategyId,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number | null {
  const all = options(state, params, modifiers);
  const eligible =
    strategy === 'balanced'
      ? all.filter((option) => option.combat.lossShare.lte(params.balancedMaxLossShare))
      : all;
  return (
    best(eligible, ORDERS[strategy]) ??
    best(
      all.filter((option) => option.defense.isZero()),
      FALLBACK_ORDER,
    )
  );
}
