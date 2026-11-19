import type { FragmentId } from '@app/finds/domain/models/finds.model';
import type { Num } from '@app/shared/util/num/num';

import type {
  FragmentProgress,
  GenomeBranch,
  GenomeNodeId,
  GenomeRoot,
  RegularNodeStatus,
  UniqueAdaptationId,
  UniqueAdaptationStatus,
} from '../../domain/models/genome.model';
import type { EffectPreviewView, UniqueEffectView } from '../models/genome-entry.model';

export interface RootDetailView {
  readonly kind: 'root';
  readonly id: GenomeRoot;
}

/** Regulärer Knoten im Detailpanel (US-05.02, US-05.03). */
export interface NodeDetailView {
  readonly kind: 'node';
  readonly id: GenomeNodeId;
  readonly branch: GenomeBranch;
  readonly status: RegularNodeStatus;
  readonly cost: Num;
  /** Fehlende DNA; 0, wenn der Preis bezahlbar ist. */
  readonly missing: Num;
  readonly predecessor: {
    readonly id: GenomeNodeId | GenomeRoot;
    readonly evolved: boolean;
  };
  readonly effects: readonly EffectPreviewView[];
}

/** Einzigartige Adaption im Detailpanel (US-06.02): wirkt, sobald alle Fragmente gefunden sind. */
export interface UniqueDetailView {
  readonly kind: 'unique';
  readonly id: UniqueAdaptationId;
  readonly status: UniqueAdaptationStatus;
  readonly fragment: FragmentId;
  readonly progress: FragmentProgress;
  readonly effects: readonly UniqueEffectView[];
}

export type GenomeDetailView = RootDetailView | NodeDetailView | UniqueDetailView;
