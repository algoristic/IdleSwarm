import type { BalanceParams } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import {
  carriedUnits,
  dnaReward,
  expectedLossShare,
  expectedLosses,
  isCapturable,
  recycledFood,
  soldierAttack,
} from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import type { SiteCandidate } from './models/map.model';

/** Einschätzung eines Kampfs (Game-Design §4.8); wird abgeleitet, nicht gespeichert. */
export interface CombatAssessment {
  /** Kämpfende Soldaten; vor dem Aufbruch `S'` nach Transport. */
  readonly soldiers: Num;
  /** `A = S · a_s*` dieser Soldaten. */
  readonly attack: Num;
  readonly capturable: boolean;
  /** Erwartete Verluste `L`; nur bei einnehmbaren Zielen aussagekräftig, sonst `λ · S`. */
  readonly losses: Num;
  /** `L / S`; 0 bei `L = 0`. */
  readonly lossShare: Num;
  readonly dna: Num;
}

/** Kampf mit `soldiers` gegen die Abwehr `defense` (Game-Design §4.8, §4.13). */
export function assessCombat(
  soldiers: Num,
  defense: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): CombatAssessment {
  const attack = soldierAttack(soldiers, params, modifiers);
  const losses = expectedLosses(soldiers, defense, params, modifiers);
  return {
    soldiers,
    attack,
    capturable: isCapturable(attack, defense),
    losses,
    lossShare: expectedLossShare(losses, soldiers),
    dna: dnaReward(defense, params),
  };
}

/**
 * Einschätzung eines Ziels vor dem Aufbruch: mit den mitkommenden Soldaten `S'` und `A' = S' · a_s*`
 * nach Transport mit der Priorität aus dem Zustand (Game-Design §4.8, §4.9; US-04.04). Reichweite
 * prüft `candidateInfo`.
 */
export function assessTarget(
  state: GameState,
  target: SiteCandidate,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): CombatAssessment {
  const { soldiers } = carriedUnits(state.units, state.priority, params, modifiers);
  return assessCombat(soldiers, target.defense, params, modifiers);
}

/** Einschätzung aller Kandidaten in der Reihenfolge der Kandidatenliste. */
export function assessTargets(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): readonly CombatAssessment[] {
  return state.map.candidates.map((target) => assessTarget(state, target, params, modifiers));
}

/**
 * Einnahme bei der Ankunft mit den dann vorhandenen Soldaten (Game-Design §4.8, §4.11): `S −= L`,
 * `DNA += d_0 · B^δ`, mit Autophagie `N += L · ρ · c_s` (§4.13). Prüft die Einnehmbarkeit nicht
 * erneut, weil `A` unterwegs nur steigen kann. Ohne Verluste und DNA (`B = 0`) kommt derselbe
 * Zustand zurück.
 */
export function applyCapture(
  state: GameState,
  target: SiteCandidate,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): GameState {
  const { res, units } = state;
  const { losses, dna } = assessCombat(units.soldiers, target.defense, params, modifiers);
  if (losses.isZero() && dna.isZero()) {
    return state;
  }
  const recycled = recycledFood(losses.min(units.soldiers), params, modifiers);
  return {
    ...state,
    res: {
      ...res,
      food: recycled.isZero() ? res.food : res.food.add(recycled),
      dna: res.dna.add(dna),
    },
    units: { ...units, soldiers: units.soldiers.sub(losses).max(Num.ZERO) },
  };
}
