import { Component, computed, input, output } from '@angular/core';

import { FIND_ENTRY_LABELS } from '@app/finds/ui/finds-labels/finds-labels';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { GenomeNodeId } from '../../domain/models/genome.model';
import {
  GENOME_NODE_DESCRIPTIONS,
  GENOME_ROOT_DESCRIPTION,
  UNIQUE_ADAPTATION_DESCRIPTIONS,
} from '../genome-descriptions/genome-descriptions';
import {
  EFFECT_TARGET_LABELS,
  GENOME_BRANCH_LABELS,
  GENOME_ROOT_LABEL,
  GENOME_TONE_TEXTS,
  GENOME_UNIQUE_KIND_LABEL,
  genomeEntryLabel,
} from '../genome-labels/genome-labels';
import type { GenomeTone } from '../models/genome-entry.model';
import type { GenomeDetailView } from './genome-detail.component.model';

/**
 * Detailpanel des gewählten Knotens (US-05.02, US-05.03, US-06.02): Ast, Name, Beschreibung,
 * Effekt vorher → nachher, Voraussetzung, Preis und Knopf zum Entwickeln.
 */
@Component({
  selector: 'app-genome-detail',
  imports: [FormatNumPipe, FormatRatePipe, FormatUpPipe],
  templateUrl: './genome-detail.component.html',
  host: { class: 'block' },
})
export class GenomeDetailComponent {
  detail = input.required<GenomeDetailView>();
  /** Eingeklappt im Bottom-Sheet (nur < 768 px): nur Ast, Name und Primäraktion. */
  collapsed = input(false);

  targetLabels = EFFECT_TARGET_LABELS;
  siteTypeLabels = SITE_TYPE_LABELS;
  fragmentLabels = FIND_ENTRY_LABELS;

  clickedEvolve = output<GenomeNodeId>();

  name = computed(() => genomeEntryLabel(this.detail().id));

  kind = computed(() => {
    const detail = this.detail();
    switch (detail.kind) {
      case 'root':
        return GENOME_ROOT_LABEL;
      case 'node':
        return GENOME_BRANCH_LABELS[detail.branch];
      case 'unique':
        return GENOME_UNIQUE_KIND_LABEL;
    }
  });

  kindTone = computed(() => {
    const detail = this.detail();
    const tone: GenomeTone = detail.kind === 'node' ? detail.branch : 'unique';
    return GENOME_TONE_TEXTS[tone];
  });

  description = computed(() => {
    const detail = this.detail();
    switch (detail.kind) {
      case 'root':
        return GENOME_ROOT_DESCRIPTION;
      case 'node':
        return GENOME_NODE_DESCRIPTIONS[detail.id];
      case 'unique':
        return UNIQUE_ADAPTATION_DESCRIPTIONS[detail.id];
    }
  });

  predecessorName = computed(() => {
    const detail = this.detail();
    return detail.kind === 'node' ? genomeEntryLabel(detail.predecessor.id) : null;
  });

  onEvolve(id: GenomeNodeId): void {
    this.clickedEvolve.emit(id);
  }
}
