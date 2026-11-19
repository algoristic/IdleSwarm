import type { BalanceParams } from '@app/balance/domain/constants';
import {
  collectRatePerDrone,
  eggsPerMinute,
  eggsPerPheromonePoint,
  foodPerSecond,
  nextQueenEffect,
  totalPheromonePoints,
  UNIQUE_ADAPTATION_PARAMS,
} from '@app/balance/domain/formulas';
import type { EffectTarget } from '@app/balance/domain/models/effect.model';
import { createBotView } from '@app/engine/domain/bot-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import {
  genomeNodePreview,
  stateModifiers,
  uniqueAdaptationPreview,
} from '@app/engine/domain/modifiers-logic';
import {
  isNodeEvolved,
  isUniqueAdaptationUnlocked,
  nodeCost,
  withFragments,
  withNode,
} from '@app/genome/domain/genome-logic';
import type { EffectPreview } from '@app/genome/domain/genome-logic';
import {
  GENOME_NODE_IDS,
  GenomeNodeId,
  UNIQUE_ADAPTATION_IDS,
  UniqueAdaptationId,
} from '@app/genome/domain/models/genome.model';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';

import { glandGainPerSecond, queenGainPerSecond } from './bots/active-bot-logic';

export const UPGRADE_KINDS = ['node', 'unique', 'gland', 'unit'] as const;
export type UpgradeKind = (typeof UPGRADE_KINDS)[number];

export const UPGRADE_CURRENCIES = ['dna', 'food', 'fragments'] as const;
export type UpgradeCurrency = (typeof UPGRADE_CURRENCIES)[number];

export type UpgradeId = GenomeNodeId | UniqueAdaptationId | 'gland' | 'queens' | 'drones';

/** Effektziele der Spieldaten und die Größen, die Drüsenpunkt und Einheiten verändern. */
export type UpgradeTarget = EffectTarget | 'eggsPerMinute' | 'foodPerSecond';

/** „vorher → nachher“ eines Ziels; JSON-tauglich für den Worker. */
export type UpgradeEffect =
  | { readonly target: UpgradeTarget; readonly before: number; readonly after: number }
  | { readonly target: UpgradeTarget; readonly before: boolean; readonly after: boolean };

/** Eine Zeile der Upgrade-Tabelle (US-10.07), bewertet am Referenzzustand. */
export interface UpgradeRow {
  readonly id: UpgradeId;
  readonly kind: UpgradeKind;
  readonly currency: UpgradeCurrency;
  /** DNA, Nahrung bzw. benötigte Fragmente. */
  readonly cost: number;
  /** Im Referenzzustand entwickelt bzw. freigeschaltet; bei Drüsenpunkt und Einheiten `false`. */
  readonly owned: boolean;
  readonly effects: readonly UpgradeEffect[];
  /**
   * Zusätzliche Nahrung/s; bei Genom-Knoten direkt aus Sammelrate und Grundertrag, bei Königin und
   * Drüsenpunkt nach der Bewertung von „Aktiv“ (Game-Design §6.3).
   */
  readonly foodGainPerSecond: number;
  /**
   * Anteil des Zuwachses an der Nahrung/s ohne das Upgrade; `null` ohne Bezug und bei Königin und
   * Drüsenpunkt, deren Ertrag eine Bewertung über gesparte Drohnenkäufe ist, keine Nahrung/s.
   */
  readonly foodGainShare: number | null;
  /** Kosten ÷ zusätzlicher Ertrag; nur bei Nahrungskosten und positivem Ertrag, sonst `null`. */
  readonly paybackMs: number | null;
}

/**
 * Nahrung/s ohne die Vorratsgrenze des Augenblicks: Bei leerem Vorrat (z. B. auf der Reise) wäre
 * sie 0 und jeder Vergleich leer; dann zählt der Vorrat als voll.
 */
function yieldPerSecond(state: GameState, params: BalanceParams): Num {
  const { site, units } = state;
  const stock = site.stock.isZero() ? site.size : site.stock;
  return foodPerSecond(units, stock, params, stateModifiers(state, params));
}

function toEffects(previews: readonly EffectPreview[]): UpgradeEffect[] {
  return previews.map((preview) => ({ ...preview }));
}

function foodGain(
  without: GameState,
  withIt: GameState,
  params: BalanceParams,
): Pick<UpgradeRow, 'foodGainPerSecond' | 'foodGainShare'> {
  const before = yieldPerSecond(without, params);
  const gain = yieldPerSecond(withIt, params).sub(before);
  return {
    foodGainPerSecond: gain.toNumber(),
    foodGainShare: before.gt(0) ? gain.div(before).toNumber() : null,
  };
}

function payback(cost: Num, gainPerSecond: Num): number | null {
  return gainPerSecond.gt(0) ? cost.div(gainPerSecond).mul(MS_PER_SECOND).toNumber() : null;
}

function nodeRow(state: GameState, id: GenomeNodeId, params: BalanceParams): UpgradeRow {
  return {
    id,
    kind: 'node',
    currency: 'dna',
    cost: nodeCost(id, params).toNumber(),
    owned: isNodeEvolved(state.genome, id),
    effects: toEffects(genomeNodePreview(state, id, params)),
    ...foodGain(withNode(state, id, false), withNode(state, id, true), params),
    paybackMs: null,
  };
}

function uniqueRow(state: GameState, id: UniqueAdaptationId, params: BalanceParams): UpgradeRow {
  const required = params[UNIQUE_ADAPTATION_PARAMS[id].fragments];
  return {
    id,
    kind: 'unique',
    currency: 'fragments',
    cost: required,
    owned: isUniqueAdaptationUnlocked(state.finds, id, params),
    effects: toEffects(uniqueAdaptationPreview(state, id, params)),
    ...foodGain(withFragments(state, id, 0), withFragments(state, id, required), params),
    paybackMs: null,
  };
}

/**
 * Drüsenpunkt, Königin und Drohne in Nahrung, bewertet wie von „Aktiv“ (Game-Design §6.3): Drohne
 * mit ihrer Sammelrate, Königin über die gesparten Drohnenkäufe, Drüsenpunkt mit `Q / P_v` × Königin.
 */
function foodRows(state: GameState, params: BalanceParams): UpgradeRow[] {
  const view = createBotView(state, state.time.played, params);
  const { modifiers, prices } = view;
  const { units, pheromones } = state;
  const queenGain = queenGainPerSecond(view, pheromones, view.netFoodPerSecond);
  const glandGain = glandGainPerSecond(state, queenGain);
  const droneGain = collectRatePerDrone(params, modifiers);
  const food = yieldPerSecond(state, params);
  const eggs = eggsPerMinute(units, pheromones, params, modifiers);
  const points = totalPheromonePoints(pheromones, params, modifiers);
  const row = (
    id: UpgradeId,
    kind: UpgradeKind,
    cost: Num,
    gain: Num,
    effects: UpgradeEffect[],
    directYield = false,
  ): UpgradeRow => ({
    id,
    kind,
    currency: 'food',
    cost: cost.toNumber(),
    owned: false,
    effects,
    foodGainPerSecond: gain.toNumber(),
    foodGainShare: directYield && food.gt(0) ? gain.div(food).toNumber() : null,
    paybackMs: payback(cost, gain),
  });
  return [
    row('gland', 'gland', view.glandPrice, glandGain, [
      { target: 'pheromonePoints', before: points, after: points + 1 },
      {
        target: 'eggsPerMinute',
        before: eggs.toNumber(),
        after: eggs.add(eggsPerPheromonePoint(units, params, modifiers)).toNumber(),
      },
    ]),
    row('queens', 'unit', prices.queens, queenGain, [
      {
        target: 'eggsPerMinute',
        before: eggs.toNumber(),
        after: eggs.add(nextQueenEffect(pheromones, params, modifiers).eggsPerMin).toNumber(),
      },
    ]),
    row(
      'drones',
      'unit',
      prices.drones,
      Num.from(droneGain),
      [{ target: 'foodPerSecond', before: food.toNumber(), after: food.add(droneGain).toNumber() }],
      true,
    ),
  ];
}

/**
 * Upgrade-Tabelle am Referenzzustand (US-10.07): alle regulären Genom-Knoten, die einzigartigen
 * Adaptionen, der nächste Drüsenpunkt und zum Vergleich Königin und Drohne. Genom-Knoten und
 * Adaptionen vergleichen den Zustand ohne und mit dem Upgrade bei allen übrigen Quellen.
 */
export function upgradeTable(state: GameState, params: BalanceParams): UpgradeRow[] {
  return [
    ...GENOME_NODE_IDS.map((id) => nodeRow(state, id, params)),
    ...UNIQUE_ADAPTATION_IDS.map((id) => uniqueRow(state, id, params)),
    ...foodRows(state, params),
  ];
}
