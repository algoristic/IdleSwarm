import type {
  GenomeNode,
  GenomeNodeId,
  GenomeRoot,
  UniqueAdaptation,
  UniqueAdaptationId,
} from '../models/genome.model';

/**
 * Reguläre Knoten der Ära I in der Reihenfolge von `GENOME_NODE_IDS` (Game-Design §4.14). Die Äste
 * sind lineare Ketten, die erste Stufe hängt an der Wurzel. Reine Struktur: Kosten und Effektwerte
 * stehen in `BalanceParams` (`genomeCost`, `genomeCostGrowth`, `GENOME_NODE_PARAMS`).
 */
export const GENOME_NODES: readonly GenomeNode[] = Object.freeze([
  {
    id: 'cilia-1',
    branch: 'collect',
    tier: 1,
    predecessor: 'root',
    effects: [{ target: 'collectRate', op: 'add' }],
  },
  {
    id: 'cilia-2',
    branch: 'collect',
    tier: 2,
    predecessor: 'cilia-1',
    effects: [{ target: 'collectRate', op: 'add' }],
  },
  {
    id: 'filter-feeder',
    branch: 'collect',
    tier: 3,
    predecessor: 'cilia-2',
    effects: [{ target: 'findChance', op: 'add' }],
  },
  {
    id: 'chemotaxis',
    branch: 'collect',
    tier: 4,
    predecessor: 'filter-feeder',
    effects: [{ target: 'range', op: 'add' }],
  },
  {
    id: 'flagellum',
    branch: 'collect',
    tier: 5,
    predecessor: 'chemotaxis',
    effects: [{ target: 'collectRate', op: 'mul' }],
  },
  {
    id: 'yolk-reserve',
    branch: 'brood',
    tier: 1,
    predecessor: 'root',
    effects: [{ target: 'broodRate', op: 'add' }],
  },
  {
    id: 'brood-combs',
    branch: 'brood',
    tier: 2,
    predecessor: 'yolk-reserve',
    effects: [{ target: 'spacePerQueen', op: 'add' }],
  },
  {
    id: 'second-gland',
    branch: 'brood',
    tier: 3,
    predecessor: 'brood-combs',
    effects: [{ target: 'pheromonePoints', op: 'add' }],
  },
  {
    id: 'nurse-cells',
    branch: 'brood',
    tier: 4,
    predecessor: 'second-gland',
    effects: [{ target: 'broodRate', op: 'add' }],
  },
  {
    id: 'budding',
    branch: 'brood',
    tier: 5,
    predecessor: 'nurse-cells',
    effects: [{ target: 'spacePerQueen', op: 'mul' }],
  },
  {
    id: 'acid-vacuole',
    branch: 'combat',
    tier: 1,
    predecessor: 'root',
    effects: [{ target: 'attackPerSoldier', op: 'add' }],
  },
  {
    id: 'autophagy',
    branch: 'combat',
    tier: 2,
    predecessor: 'acid-vacuole',
    effects: [
      { target: 'sacrificeYield', op: 'add' },
      { target: 'fallenRecycling', op: 'unlock' },
    ],
  },
  {
    id: 'nettle-cells',
    branch: 'combat',
    tier: 3,
    predecessor: 'autophagy',
    effects: [{ target: 'combatLoss', op: 'mul' }],
  },
  {
    id: 'chalk-shell',
    branch: 'combat',
    tier: 4,
    predecessor: 'nettle-cells',
    effects: [{ target: 'combatLoss', op: 'mul' }],
  },
  {
    id: 'spine-cells',
    branch: 'combat',
    tier: 5,
    predecessor: 'chalk-shell',
    effects: [{ target: 'attackPerSoldier', op: 'add' }],
  },
]);

export const GENOME_NODE_BY_ID: Readonly<Record<GenomeNodeId, GenomeNode>> = Object.freeze(
  Object.fromEntries(GENOME_NODES.map((node) => [node.id, node])) as Record<
    GenomeNodeId,
    GenomeNode
  >,
);

/**
 * Vorgänger je regulärem Knoten (Game-Design §4.14), abgeleitet aus {@link GENOME_NODES}. Die
 * Ladeprüfung nutzt sie (§5.1).
 */
export const GENOME_NODE_PREDECESSORS: Readonly<Record<GenomeNodeId, GenomeNodeId | GenomeRoot>> =
  Object.freeze(
    Object.fromEntries(GENOME_NODES.map((node) => [node.id, node.predecessor])) as Record<
      GenomeNodeId,
      GenomeNodeId | GenomeRoot
    >,
  );

/**
 * Einzigartige Adaptionen der Ära I in der Reihenfolge von `UNIQUE_ADAPTATION_IDS`
 * (Game-Design §4.14). Benötigte Fragmente und Effektwerte stehen in `BalanceParams`
 * (`UNIQUE_ADAPTATION_PARAMS`).
 */
export const UNIQUE_ADAPTATIONS: readonly UniqueAdaptation[] = Object.freeze([
  {
    id: 'thermosynthesis',
    anchor: 'cilia-1',
    fragment: 'thermophile',
    effects: [{ target: 'collectRate', op: 'add', when: { siteType: 'vent' } }],
  },
  {
    id: 'algal-symbiosis',
    anchor: 'cilia-1',
    fragment: 'chloroplast',
    effects: [{ target: 'collectRate', op: 'add', when: { siteType: 'algal-mat' } }],
  },
  {
    id: 'crystal-sense',
    anchor: 'yolk-reserve',
    fragment: 'primal-crystal',
    effects: [{ target: 'findChance', op: 'add' }],
  },
  {
    id: 'sulfur-shell',
    anchor: 'acid-vacuole',
    fragment: 'sulfur-pearl',
    effects: [{ target: 'attackPerSoldier', op: 'add' }],
  },
]);

export const UNIQUE_ADAPTATION_BY_ID: Readonly<Record<UniqueAdaptationId, UniqueAdaptation>> =
  Object.freeze(
    Object.fromEntries(
      UNIQUE_ADAPTATIONS.map((adaptation) => [adaptation.id, adaptation]),
    ) as Record<UniqueAdaptationId, UniqueAdaptation>,
  );
