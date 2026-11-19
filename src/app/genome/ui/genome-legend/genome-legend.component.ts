import { Component } from '@angular/core';

import { GENOME_BRANCHES } from '../../domain/models/genome.model';
import {
  GENOME_BRANCH_LABELS,
  GENOME_STATUS_LABELS,
  GENOME_TONE_BACKGROUNDS,
  GENOME_UNIQUE_KIND_LABEL,
} from '../genome-labels/genome-labels';

/** Legende des Genom-Baums (Mockup K2-K `.top.only-gen`): Farben der Äste und Form der Status. */
@Component({
  selector: 'app-genome-legend',
  templateUrl: './genome-legend.component.html',
  host: { class: 'block' },
})
export class GenomeLegendComponent {
  branches = GENOME_BRANCHES;
  branchLabels = GENOME_BRANCH_LABELS;
  statusLabels = GENOME_STATUS_LABELS;
  uniqueKindLabel = GENOME_UNIQUE_KIND_LABEL;
  toneBackgrounds = GENOME_TONE_BACKGROUNDS;
}
