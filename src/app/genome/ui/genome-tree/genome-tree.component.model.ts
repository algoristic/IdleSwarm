import type { FragmentId } from '@app/finds/domain/models/finds.model';
import type { Num } from '@app/shared/util/num/num';

import type { NodeDecoration, TreeOrganelle } from '../../domain/genome-tree-logic';
import type {
  FragmentProgress,
  GenomeBranch,
  GenomeNodeId,
  GenomeNodeStatus,
  GenomeRoot,
  UniqueAdaptationId,
} from '../../domain/models/genome.model';
import type { GenomeEntryId, GenomeTone } from '../models/genome-entry.model';

/** Darstellung eines Asts: entwickelt (kräftig), offen (blass) oder gesperrt (gepunktet). */
export type TreeEdgeStyle = 'evolved' | 'open' | 'locked';

export interface TreeEdgeView {
  /** ID des Kindknotens; jeder Knoten hat genau einen eingehenden Ast. */
  readonly id: Exclude<GenomeEntryId, GenomeRoot>;
  readonly tone: GenomeTone;
  readonly style: TreeEdgeStyle;
  readonly path: string;
}

interface TreeNodeBase {
  readonly tone: GenomeTone;
  /** Die Wurzel ist immer `evolved`. */
  readonly status: GenomeNodeStatus;
  readonly radius: number;
  /** `transform` der Knotengruppe; alle übrigen Maße sind relativ zum Mittelpunkt. */
  readonly translate: string;
  /** `transform` der Kugel eines entwickelten Knotens, gezeichnet im Einheitskreis. */
  readonly ballScale: string;
  readonly decoration: NodeDecoration;
  /** DNA-Preis im Kostenschild, nur bei `available` und `too-expensive`. */
  readonly cost: Num | null;
  /** Fortschritt im Schild einer noch nicht gefundenen einzigartigen Adaption. */
  readonly progress: FragmentProgress | null;
  readonly selected: boolean;
}

export type TreeNodeView = TreeNodeBase &
  (
    | { readonly kind: 'root'; readonly id: GenomeRoot }
    | { readonly kind: 'node'; readonly id: GenomeNodeId; readonly branch: GenomeBranch }
    | { readonly kind: 'unique'; readonly id: UniqueAdaptationId; readonly fragment: FragmentId }
  );

export interface GenomeTreeView {
  readonly viewBox: string;
  readonly center: number;
  readonly nucleusRadius: number;
  readonly nucleusRingRadius: number;
  readonly membrane: string;
  readonly organelles: readonly TreeOrganelle[];
  readonly edges: readonly TreeEdgeView[];
  /** Wurzel zuerst, dann die regulären Knoten und die einzigartigen Adaptionen. */
  readonly nodes: readonly TreeNodeView[];
}
