import type { BalanceParams } from '@app/balance/domain/constants';
import { modifierFactor } from '@app/balance/domain/effects-logic';
import {
  attackPerSoldier,
  collectRatePerDrone,
  GENOME_NODE_PARAMS,
  genomeNodeCost,
  isAffordable,
  queenEggsPerMinute,
  sacrificeYieldShare,
  spacePerQueen,
  swarmRange,
  totalPheromonePoints,
  UNIQUE_ADAPTATION_PARAMS,
} from '@app/balance/domain/formulas';
import type {
  Effect,
  EffectTarget,
  Modifiers,
  UnlockEffectTarget,
  ValueEffectTarget,
} from '@app/balance/domain/models/effect.model';
import { UNLOCK_EFFECT_TARGETS } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Finds } from '@app/finds/domain/models/finds.model';
import { Num } from '@app/shared/util/num/num';

import {
  GENOME_NODE_BY_ID,
  GENOME_NODES,
  UNIQUE_ADAPTATION_BY_ID,
  UNIQUE_ADAPTATIONS,
} from './data/genome-era1.data';
import type { GenomeEvent, GenomeResult } from './models/genome-event.model';
import {
  EffectSpec,
  FragmentProgress,
  Genome,
  GENOME_ROOT,
  GenomeNodeId,
  RegularNodeStatus,
  UniqueAdaptationId,
  UniqueAdaptationStatus,
} from './models/genome.model';

/** Wert eines Effektziels vorher und nachher (Detailpanel, US-05.02). */
export type EffectPreview =
  | { readonly target: ValueEffectTarget; readonly before: number; readonly after: number }
  | { readonly target: UnlockEffectTarget; readonly before: boolean; readonly after: boolean };

const NO_EFFECTS: readonly Effect[] = Object.freeze([]);
const NO_EVENTS: readonly GenomeEvent[] = Object.freeze([]);

/** Setzt den Wert aus `params` in die Effekte der Spieldaten ein; ein Effekt ohne Zahl bleibt. */
function resolveEffects(specs: readonly EffectSpec[], value: number): readonly Effect[] {
  return specs.map((spec) => (spec.op === 'unlock' ? spec : { ...spec, value }));
}

/** DNA-Kosten eines regulären Knotens nach seiner Stufe (Game-Design §4.14). */
export function nodeCost(id: GenomeNodeId, params: BalanceParams): Num {
  return genomeNodeCost(GENOME_NODE_BY_ID[id].tier, params);
}

/** Effekte eines regulären Knotens mit dem Wert `<id>Effect` aus `params`. */
export function nodeEffects(id: GenomeNodeId, params: BalanceParams): readonly Effect[] {
  return resolveEffects(GENOME_NODE_BY_ID[id].effects, params[GENOME_NODE_PARAMS[id].effect]);
}

/** Effekte einer einzigartigen Adaption mit dem Wert `<id>Effect` aus `params`. */
export function uniqueAdaptationEffects(
  id: UniqueAdaptationId,
  params: BalanceParams,
): readonly Effect[] {
  return resolveEffects(
    UNIQUE_ADAPTATION_BY_ID[id].effects,
    params[UNIQUE_ADAPTATION_PARAMS[id].effect],
  );
}

/** Ist der Knoten entwickelt? Die Wurzel ist es immer (Game-Design §4.14). */
export function isNodeEvolved(genome: Genome, id: GenomeNodeId | typeof GENOME_ROOT): boolean {
  return id === GENOME_ROOT || genome.owned.includes(id);
}

/** Ist der Vorgänger des Knotens entwickelt (US-05.01)? */
export function isNodeUnlocked(genome: Genome, id: GenomeNodeId): boolean {
  return isNodeEvolved(genome, GENOME_NODE_BY_ID[id].predecessor);
}

/**
 * Status eines regulären Knotens (Game-Design §4.14): `evolved` in `owned`, sonst `locked` ohne
 * entwickelten Vorgänger, sonst `available` bzw. `too-expensive` nach DNA.
 */
export function nodeStatus(
  state: GameState,
  id: GenomeNodeId,
  params: BalanceParams,
): RegularNodeStatus {
  if (isNodeEvolved(state.genome, id)) {
    return 'evolved';
  }
  if (!isNodeUnlocked(state.genome, id)) {
    return 'locked';
  }
  return isAffordable(nodeCost(id, params), state.res.dna) ? 'available' : 'too-expensive';
}

/** Bedingungen von `evolve` (Game-Design §4.14): nicht entwickelt, Vorgänger entwickelt, DNA reicht. */
export function canEvolve(state: GameState, id: GenomeNodeId, params: BalanceParams): boolean {
  return nodeStatus(state, id, params) === 'available';
}

/** Anzahl der Knoten mit Status `available` für den Hinweis aus US-05.04. */
export function availableNodeCount(state: GameState, params: BalanceParams): number {
  return GENOME_NODES.filter((node) => canEvolve(state, node.id, params)).length;
}

/** `owned` mit bzw. ohne den Knoten, in der Reihenfolge der Spieldaten (Game-Design §5.1). */
function withOwned(genome: Genome, id: GenomeNodeId, owned: boolean): Genome {
  return {
    ...genome,
    owned: GENOME_NODES.map((node) => node.id).filter((nodeId) =>
      nodeId === id ? owned : genome.owned.includes(nodeId),
    ),
  };
}

/**
 * Entwickelt einen regulären Knoten (Game-Design §4.14): `DNA −= Kosten`, `owned += ID`, Ereignis
 * `evolved`. Wirkt sofort, auch während einer Reise. Ist eine Bedingung verletzt, kommt derselbe
 * Zustand ohne Ereignisse zurück.
 */
export function evolve(state: GameState, id: GenomeNodeId, params: BalanceParams): GenomeResult {
  if (!canEvolve(state, id, params)) {
    return { state, events: NO_EVENTS };
  }
  const { res } = state;
  const cost = nodeCost(id, params);
  // `sub` rundet; die Untergrenze hält die DNA auch dann nicht negativ.
  const dna = res.dna.sub(cost).max(Num.ZERO);
  return {
    state: { ...state, res: { ...res, dna }, genome: withOwned(state.genome, id, true) },
    events: [{ type: 'evolved', playedMs: state.time.played, node: id, cost }],
  };
}

/**
 * Fragmentfortschritt einer einzigartigen Adaption: `min(Zähler, benötigt) / benötigt`
 * (Game-Design §4.14, §4.17). Ein Zähler über der benötigten Zahl wirkt wie die benötigte Zahl.
 */
export function fragmentProgress(
  finds: Finds,
  id: UniqueAdaptationId,
  params: BalanceParams,
): FragmentProgress {
  const required = params[UNIQUE_ADAPTATION_PARAMS[id].fragments];
  const count = finds.collected[UNIQUE_ADAPTATION_BY_ID[id].fragment] ?? 0;
  return { found: Math.min(count, required), required };
}

/**
 * Wirkt die einzigartige Adaption? Abgeleitet aus den Fragmentzählern, nicht gespeichert
 * (Game-Design §4.14, §5.1): sobald alle Fragmente gefunden sind, ohne DNA und ohne Kauf.
 */
export function isUniqueAdaptationUnlocked(
  finds: Finds,
  id: UniqueAdaptationId,
  params: BalanceParams,
): boolean {
  const count = finds.collected[UNIQUE_ADAPTATION_BY_ID[id].fragment] ?? 0;
  return count >= params[UNIQUE_ADAPTATION_PARAMS[id].fragments];
}

/** Status einer einzigartigen Adaption (Game-Design §4.14): `evolved` oder `undiscovered`. */
export function uniqueAdaptationStatus(
  finds: Finds,
  id: UniqueAdaptationId,
  params: BalanceParams,
): UniqueAdaptationStatus {
  return isUniqueAdaptationUnlocked(finds, id, params) ? 'evolved' : 'undiscovered';
}

/**
 * Effekte des Genoms (Game-Design §4.13): entwickelte reguläre Knoten und freigeschaltete
 * einzigartige Adaptionen, je Quelle einmal. Ohne Quelle eine leere Liste.
 */
export function genomeEffects(
  genome: Genome,
  finds: Finds,
  params: BalanceParams,
): readonly Effect[] {
  const effects: Effect[] = [];
  for (const id of genome.owned) {
    effects.push(...nodeEffects(id, params));
  }
  for (const { id } of UNIQUE_ADAPTATIONS) {
    if (isUniqueAdaptationUnlocked(finds, id, params)) {
      effects.push(...uniqueAdaptationEffects(id, params));
    }
  }
  return effects.length === 0 ? NO_EFFECTS : effects;
}

/**
 * Angezeigter Wert eines Effektziels über die zugehörige Formel: Sammelrate je Drohne, Eier/min je
 * Königin, `M_fund`, `M_verlust`, Ausbeute `η`, Reichweite, Angriff je Soldat, Platz je Königin,
 * Pheromonpunkte `P_ges`.
 */
function targetValue(
  target: ValueEffectTarget,
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
): number {
  switch (target) {
    case 'collectRate':
      return collectRatePerDrone(params, modifiers);
    case 'broodRate':
      return queenEggsPerMinute(state.pheromones, params, modifiers);
    case 'findChance':
      return modifierFactor(modifiers.findChance);
    case 'combatLoss':
      return modifierFactor(modifiers.combatLoss);
    case 'sacrificeYield':
      return sacrificeYieldShare(params, modifiers);
    case 'range':
      return swarmRange(params, modifiers);
    case 'attackPerSoldier':
      return attackPerSoldier(params, modifiers);
    case 'spacePerQueen':
      return spacePerQueen(params, modifiers);
    case 'pheromonePoints':
      return totalPheromonePoints(state.pheromones, params, modifiers);
  }
}

function isUnlockTarget(target: EffectTarget): target is UnlockEffectTarget {
  return (UNLOCK_EFFECT_TARGETS as readonly EffectTarget[]).includes(target);
}

/**
 * „Effekt vorher → nachher“ eines regulären Knotens (Game-Design §4.14, US-05.02): je Effektziel des
 * Knotens der Wert ohne und mit dem Knoten, bei allen übrigen Quellen des Zustands. `modifiersOf`
 * liefert die Modifikatoren eines Zustands (`stateModifiers` aus `engine/domain`); so bleibt die
 * Ableitung an einer Stelle, und `genome` hängt zur Laufzeit nicht von `engine` ab.
 */
export function nodeEffectPreview(
  state: GameState,
  id: GenomeNodeId,
  params: BalanceParams,
  modifiersOf: (state: GameState) => Modifiers,
): readonly EffectPreview[] {
  const before = modifiersOf({ ...state, genome: withOwned(state.genome, id, false) });
  const after = modifiersOf({ ...state, genome: withOwned(state.genome, id, true) });
  return effectPreviews(GENOME_NODE_BY_ID[id].effects, state, params, before, after);
}

function effectPreviews(
  effects: readonly EffectSpec[],
  state: GameState,
  params: BalanceParams,
  before: Modifiers,
  after: Modifiers,
): readonly EffectPreview[] {
  return effects.map(({ target }): EffectPreview => {
    if (isUnlockTarget(target)) {
      return { target, before: before[target], after: after[target] };
    }
    return {
      target,
      before: targetValue(target, state, params, before),
      after: targetValue(target, state, params, after),
    };
  });
}

/** Zustand mit genau `count` Fragmenten der einzigartigen Adaption; die übrigen Funde bleiben. */
export function withFragments(state: GameState, id: UniqueAdaptationId, count: number): GameState {
  const { finds } = state;
  const fragment = UNIQUE_ADAPTATION_BY_ID[id].fragment;
  return { ...state, finds: { ...finds, collected: { ...finds.collected, [fragment]: count } } };
}

/**
 * „Effekt vorher → nachher“ einer einzigartigen Adaption (Game-Design §4.14): ohne Fragmente und
 * mit allen benötigten, bei allen übrigen Quellen des Zustands; `modifiersOf` wie bei
 * {@link nodeEffectPreview}.
 */
export function uniqueAdaptationEffectPreview(
  state: GameState,
  id: UniqueAdaptationId,
  params: BalanceParams,
  modifiersOf: (state: GameState) => Modifiers,
): readonly EffectPreview[] {
  const required = params[UNIQUE_ADAPTATION_PARAMS[id].fragments];
  const before = modifiersOf(withFragments(state, id, 0));
  const after = modifiersOf(withFragments(state, id, required));
  return effectPreviews(UNIQUE_ADAPTATION_BY_ID[id].effects, state, params, before, after);
}

/** `owned` mit bzw. ohne den Knoten, für Vergleiche „ohne → mit“ (Modell-Seite, US-10.07). */
export function withNode(state: GameState, id: GenomeNodeId, owned: boolean): GameState {
  return { ...state, genome: withOwned(state.genome, id, owned) };
}
