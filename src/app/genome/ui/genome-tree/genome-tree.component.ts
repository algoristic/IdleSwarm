import { Component, computed, input, output } from '@angular/core';

import { FIND_ENTRY_LABELS } from '@app/finds/ui/finds-labels/finds-labels';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { formatNum } from '@app/shared/util/format/format';

import { GENOME_BRANCHES, GenomeNodeStatus } from '../../domain/models/genome.model';
import {
  GENOME_BRANCH_LABELS,
  GENOME_STATUS_LABELS,
  GENOME_TONE_BACKGROUNDS,
  GENOME_TONE_FILLS,
  GENOME_TONE_STROKES,
  GENOME_UNIQUE_KIND_LABEL,
  genomeEntryLabel,
} from '../genome-labels/genome-labels';
import type { GenomeEntryId } from '../models/genome-entry.model';
import type {
  GenomeTreeView,
  TreeEdgeStyle,
  TreeEdgeView,
  TreeNodeView,
} from './genome-tree.component.model';

interface TreeEdgeItem {
  readonly edge: TreeEdgeView;
  readonly stroke: string;
}

interface TreeNodeItem {
  readonly node: TreeNodeView;
  readonly name: string;
  readonly ariaLabel: string;
}

/** Linienbreite, Deckkraft und Strichelung je Darstellung eines Asts (Mockup K2-K). */
const EDGE_WIDTHS: Readonly<Record<TreeEdgeStyle, number>> = { evolved: 7, open: 4, locked: 3 };
const EDGE_OPACITIES: Readonly<Record<TreeEdgeStyle, number>> = {
  evolved: 1,
  open: 0.45,
  locked: 1,
};
const EDGE_DASHES: Readonly<Record<TreeEdgeStyle, string | null>> = {
  evolved: null,
  open: null,
  locked: '1 9',
};

/** Farbe der Beschriftung je Status; gesperrte treten zurück. */
const LABEL_FILLS: Readonly<Record<GenomeNodeStatus, string>> = {
  evolved: 'fill-fg',
  available: 'fill-fg',
  'too-expensive': 'fill-fg',
  locked: 'fill-locked-fg',
  undiscovered: 'fill-fg',
};

/** Kostenschild: kräftig, wenn bezahlbar, sonst gedämpft. */
const TAG_FILLS: Readonly<Record<GenomeNodeStatus, string>> = {
  evolved: 'fill-cost-muted',
  available: 'fill-violet',
  'too-expensive': 'fill-cost-muted',
  locked: 'fill-cost-muted',
  undiscovered: 'fill-cost-muted',
};

const TAG_TEXT_FILLS: Readonly<Record<GenomeNodeStatus, string>> = {
  evolved: 'fill-cost-muted-fg',
  available: 'fill-on-accent',
  'too-expensive': 'fill-cost-muted-fg',
  locked: 'fill-cost-muted-fg',
  undiscovered: 'fill-cost-muted-fg',
};

/**
 * Radialer Genom-Baum im Zellkern im K2-Stil (US-05.02, US-05.04): Membran, Organellen, gebogene
 * Äste und Knoten mit Statusdarstellung, darunter die Legende. Jeder Knoten ist ein Knopf;
 * verfügbare pulsieren.
 */
@Component({
  selector: 'app-genome-tree',
  imports: [FormatNumPipe],
  templateUrl: './genome-tree.component.html',
  styleUrl: './genome-tree.component.css',
  host: { class: 'block' },
})
export class GenomeTreeComponent {
  tree = input.required<GenomeTreeView>();

  branches = GENOME_BRANCHES;
  branchLabels = GENOME_BRANCH_LABELS;
  statusLabels = GENOME_STATUS_LABELS;
  uniqueKindLabel = GENOME_UNIQUE_KIND_LABEL;
  toneFills = GENOME_TONE_FILLS;
  toneStrokes = GENOME_TONE_STROKES;
  toneBackgrounds = GENOME_TONE_BACKGROUNDS;
  edgeWidths = EDGE_WIDTHS;
  edgeOpacities = EDGE_OPACITIES;
  edgeDashes = EDGE_DASHES;
  labelFills = LABEL_FILLS;
  tagFills = TAG_FILLS;
  tagTextFills = TAG_TEXT_FILLS;

  selectedEntry = output<GenomeEntryId>();

  nodes = computed<readonly TreeNodeItem[]>(() =>
    this.tree().nodes.map((node) => {
      const name = genomeEntryLabel(node.id);
      return { node, name, ariaLabel: this.#ariaLabel(node, name) };
    }),
  );

  edges = computed<readonly TreeEdgeItem[]>(() =>
    this.tree().edges.map((edge) => ({
      edge,
      stroke: edge.style === 'locked' ? 'stroke-locked' : GENOME_TONE_STROKES[edge.tone],
    })),
  );

  title = $localize`:@@uiGenome-genomeTree-title:Genom im Zellkern`;

  onSelect(id: GenomeEntryId): void {
    this.selectedEntry.emit(id);
  }

  onKeySelect(event: Event, id: GenomeEntryId): void {
    // Leertaste würde sonst die Seite scrollen.
    event.preventDefault();
    this.selectedEntry.emit(id);
  }

  #ariaLabel(node: TreeNodeView, name: string): string {
    const status = GENOME_STATUS_LABELS[node.status];
    switch (node.kind) {
      case 'root':
        return name;
      case 'unique': {
        const kind = GENOME_UNIQUE_KIND_LABEL;
        if (node.progress === null) {
          return $localize`:@@uiGenome-genomeTree-unique:${name}:name:, ${kind}:kind:: ${status}:status:`;
        }
        const fragment = FIND_ENTRY_LABELS[node.fragment];
        const { found, required } = node.progress;
        return $localize`:@@uiGenome-genomeTree-uniqueProgress:${name}:name:, ${kind}:kind:: ${status}:status:, ${fragment}:fragment: ${found}:found: / ${required}:required:`;
      }
      case 'node': {
        const branch = GENOME_BRANCH_LABELS[node.branch];
        if (node.cost === null) {
          return $localize`:@@uiGenome-genomeTree-node:${name}:name:, ${branch}:branch:: ${status}:status:`;
        }
        return $localize`:@@uiGenome-genomeTree-nodeCost:${name}:name:, ${branch}:branch:: ${status}:status:, ${formatNum(node.cost)}:cost: DNA`;
      }
    }
  }
}
