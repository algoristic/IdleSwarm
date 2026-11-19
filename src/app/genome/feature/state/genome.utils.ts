import type { BalanceParams } from '@app/balance/domain/constants';
import type { Effect, ValueEffectTarget } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { genomeNodePreview } from '@app/engine/domain/modifiers-logic';
import { Num } from '@app/shared/util/num/num';

import {
  GENOME_NODE_BY_ID,
  GENOME_NODES,
  UNIQUE_ADAPTATION_BY_ID,
  UNIQUE_ADAPTATIONS,
} from '../../domain/data/genome-era1.data';
import {
  availableNodeCount,
  EffectPreview,
  fragmentProgress,
  isNodeEvolved,
  nodeCost,
  nodeStatus,
  uniqueAdaptationEffects,
  uniqueAdaptationStatus,
} from '../../domain/genome-logic';
import {
  branchPath,
  membranePath,
  NODE_RADIUS,
  nodeDecoration,
  NUCLEUS_RADIUS,
  NUCLEUS_RING_RADIUS,
  organelle,
  polarPoint,
  ROOT_RADIUS,
  translate,
  TREE_CENTER,
  TREE_SIZE,
} from '../../domain/genome-tree-logic';
import {
  GENOME_ROOT,
  GenomeNode,
  GenomeNodeId,
  GenomeNodeStatus,
  isGenomeNodeId,
  RegularNodeStatus,
  UniqueAdaptation,
  UniqueAdaptationId,
  UniqueAdaptationStatus,
} from '../../domain/models/genome.model';
import type { GenomeDetailView } from '../../ui/genome-detail/genome-detail.component.model';
import type {
  GenomeTreeView,
  TreeEdgeStyle,
  TreeEdgeView,
  TreeNodeView,
} from '../../ui/genome-tree/genome-tree.component.model';
import { GENOME_LAYOUT, ORGANELLE_LAYOUT } from '../../ui/genome-tree/genome-tree.layout';
import type {
  EffectFormat,
  EffectPreviewView,
  GenomeEntryId,
  UniqueEffectView,
} from '../../ui/models/genome-entry.model';
import type { GenomeSource, GenomeView } from './genome.model';

/**
 * Anzeige je Effektziel im „vorher → nachher“: Faktoren und Anteile als Prozent, Sammelleistung als
 * Prozent der Grundrate (je Drohne nur Hundertstel, die `formatRate` nicht zeigt).
 */
const PREVIEW_FORMATS: Readonly<Record<ValueEffectTarget, EffectFormat>> = {
  collectRate: 'percent',
  broodRate: 'rate',
  findChance: 'percent',
  combatLoss: 'percent',
  sacrificeYield: 'percent',
  range: 'count',
  attackPerSoldier: 'rate',
  spacePerQueen: 'count',
  pheromonePoints: 'count',
};

/**
 * Anzeige des Betrags eines Effekts einer einzigartigen Adaption: `add` auf einen Modifikator
 * (Basis 1) bzw. auf einen Anteil zählt als Prozent, sonst in der Einheit des Werts.
 */
const DELTA_FORMATS: Readonly<Record<ValueEffectTarget, EffectFormat>> = {
  collectRate: 'percent',
  broodRate: 'percent',
  findChance: 'percent',
  combatLoss: 'percent',
  sacrificeYield: 'percent',
  range: 'count',
  attackPerSoldier: 'rate',
  spacePerQueen: 'count',
  pheromonePoints: 'count',
};

const PERCENT = 100;

interface Statuses {
  readonly nodes: Readonly<Record<GenomeNodeId, RegularNodeStatus>>;
  readonly uniques: Readonly<Record<UniqueAdaptationId, UniqueAdaptationStatus>>;
}

/** Viewmodel der Genom-Ansicht (US-05.02–05.04, US-06.02); rein und ohne Angular testbar. */
export function toGenomeView(source: GenomeSource, params: BalanceParams): GenomeView {
  const { state } = source;
  const statuses = toStatuses(state, params);
  const selected = source.selected ?? defaultSelection(statuses);
  return {
    dna: state.res.dna,
    availableCount: availableNodeCount(state, params),
    selected,
    tree: toTreeView(state, statuses, selected, params),
    detail: toDetailView(state, statuses, selected, params),
  };
}

function toStatuses(state: GameState, params: BalanceParams): Statuses {
  return {
    nodes: Object.fromEntries(
      GENOME_NODES.map((node) => [node.id, nodeStatus(state, node.id, params)]),
    ) as Record<GenomeNodeId, RegularNodeStatus>,
    uniques: Object.fromEntries(
      UNIQUE_ADAPTATIONS.map((unique) => [
        unique.id,
        uniqueAdaptationStatus(state.finds, unique.id, params),
      ]),
    ) as Record<UniqueAdaptationId, UniqueAdaptationStatus>,
  };
}

/** Ohne Wahl: der erste verfügbare Knoten, sonst der erste zu teure, sonst die Wurzel. */
function defaultSelection(statuses: Statuses): GenomeEntryId {
  const first = (status: GenomeNodeStatus) =>
    GENOME_NODES.find((node) => statuses.nodes[node.id] === status)?.id;
  return first('available') ?? first('too-expensive') ?? GENOME_ROOT;
}

function toTreeView(
  state: GameState,
  statuses: Statuses,
  selected: GenomeEntryId,
  params: BalanceParams,
): GenomeTreeView {
  const root: TreeNodeView = {
    ...nodeBase(GENOME_ROOT, ROOT_RADIUS, selected),
    kind: 'root',
    id: GENOME_ROOT,
    tone: 'unique',
    status: 'evolved',
    cost: null,
    progress: null,
  };
  const regular = GENOME_NODES.map((node): TreeNodeView => {
    const status = statuses.nodes[node.id];
    const priced = status === 'available' || status === 'too-expensive';
    return {
      ...nodeBase(node.id, NODE_RADIUS, selected),
      kind: 'node',
      id: node.id,
      branch: node.branch,
      tone: node.branch,
      status,
      cost: priced ? nodeCost(node.id, params) : null,
      progress: null,
    };
  });
  const uniques = UNIQUE_ADAPTATIONS.map((unique): TreeNodeView => {
    const status = statuses.uniques[unique.id];
    return {
      ...nodeBase(unique.id, NODE_RADIUS, selected),
      kind: 'unique',
      id: unique.id,
      fragment: unique.fragment,
      tone: 'unique',
      status,
      cost: null,
      progress: status === 'evolved' ? null : fragmentProgress(state.finds, unique.id, params),
    };
  });
  return {
    viewBox: `0 0 ${TREE_SIZE} ${TREE_SIZE}`,
    center: TREE_CENTER,
    nucleusRadius: NUCLEUS_RADIUS,
    nucleusRingRadius: NUCLEUS_RING_RADIUS,
    membrane: membranePath(),
    organelles: ORGANELLE_LAYOUT.map((layout) => organelle(layout, layout.rx, layout.ry)),
    edges: [
      ...GENOME_NODES.map((node) => regularEdge(node, statuses)),
      ...UNIQUE_ADAPTATIONS.map((unique) => uniqueEdge(unique, statuses)),
    ],
    nodes: [root, ...regular, ...uniques],
  };
}

function nodeBase(
  id: GenomeEntryId,
  radius: number,
  selected: GenomeEntryId,
): Pick<TreeNodeView, 'radius' | 'translate' | 'ballScale' | 'decoration' | 'selected'> {
  const layout = GENOME_LAYOUT[id];
  return {
    radius,
    translate: translate(polarPoint(layout)),
    ballScale: `scale(${radius})`,
    decoration: nodeDecoration(radius, layout.label, layout.tag),
    selected: id === selected,
  };
}

function regularEdge(node: GenomeNode, statuses: Statuses): TreeEdgeView {
  const status = statuses.nodes[node.id];
  const style: TreeEdgeStyle =
    status === 'evolved' ? 'evolved' : status === 'locked' ? 'locked' : 'open';
  return {
    id: node.id,
    tone: node.branch,
    style,
    path: branchPath(
      GENOME_LAYOUT[node.predecessor],
      GENOME_LAYOUT[node.id],
      node.predecessor === GENOME_ROOT,
    ),
  };
}

/** Einzigartige hängen am Anker; bis zur Freischaltung gepunktet wie gesperrte Äste. */
function uniqueEdge(unique: UniqueAdaptation, statuses: Statuses): TreeEdgeView {
  return {
    id: unique.id,
    tone: 'unique',
    style: statuses.uniques[unique.id] === 'evolved' ? 'evolved' : 'locked',
    path: branchPath(GENOME_LAYOUT[unique.anchor], GENOME_LAYOUT[unique.id], false),
  };
}

function toDetailView(
  state: GameState,
  statuses: Statuses,
  selected: GenomeEntryId,
  params: BalanceParams,
): GenomeDetailView {
  if (selected === GENOME_ROOT) {
    return { kind: 'root', id: GENOME_ROOT };
  }
  if (isGenomeNodeId(selected)) {
    const { branch, predecessor } = GENOME_NODE_BY_ID[selected];
    const status = statuses.nodes[selected];
    const cost = nodeCost(selected, params);
    return {
      kind: 'node',
      id: selected,
      branch,
      status,
      cost,
      missing: cost.sub(state.res.dna).max(Num.ZERO),
      predecessor: { id: predecessor, evolved: isNodeEvolved(state.genome, predecessor) },
      effects: genomeNodePreview(state, selected, params).map((preview) =>
        toPreviewView(preview, params),
      ),
    };
  }
  return {
    kind: 'unique',
    id: selected,
    status: statuses.uniques[selected],
    fragment: UNIQUE_ADAPTATION_BY_ID[selected].fragment,
    progress: fragmentProgress(state.finds, selected, params),
    effects: uniqueAdaptationEffects(selected, params).map(toUniqueEffectView),
  };
}

function isUnlockPreview(
  preview: EffectPreview,
): preview is Extract<EffectPreview, { readonly before: boolean }> {
  return typeof preview.before === 'boolean';
}

function toPreviewView(preview: EffectPreview, params: BalanceParams): EffectPreviewView {
  if (isUnlockPreview(preview)) {
    return { kind: 'unlock', target: preview.target, before: preview.before, after: preview.after };
  }
  const { target } = preview;
  const format = PREVIEW_FORMATS[target];
  const scale = previewScale(target, format, params);
  return {
    kind: 'value',
    target,
    format,
    before: preview.before * scale,
    after: preview.after * scale,
  };
}

/** Sammelleistung relativ zur Grundrate (100 % ohne Effekte), übrige Prozentwerte als Anteil. */
function previewScale(
  target: ValueEffectTarget,
  format: EffectFormat,
  params: BalanceParams,
): number {
  if (format !== 'percent') {
    return 1;
  }
  if (target === 'collectRate') {
    return params.droneCollectRate > 0 ? PERCENT / params.droneCollectRate : 0;
  }
  return PERCENT;
}

function toUniqueEffectView(effect: Effect): UniqueEffectView {
  const siteType = effect.when?.siteType ?? null;
  if (effect.op === 'unlock') {
    return { kind: 'unlock', target: effect.target, siteType };
  }
  const format = effect.op === 'mul' ? 'percent' : DELTA_FORMATS[effect.target];
  // `mul` wirkt als Faktor: ×1,25 sind +25 %.
  const amount = effect.op === 'mul' ? effect.value - 1 : effect.value;
  const delta = format === 'percent' ? amount * PERCENT : amount;
  return {
    kind: 'value',
    target: effect.target,
    format,
    delta,
    sign: delta > 0 ? '+' : '',
    siteType,
  };
}
