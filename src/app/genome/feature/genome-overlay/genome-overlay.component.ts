import { Component, inject } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { GenomeDetailComponent } from '../../ui/genome-detail/genome-detail.component';
import { GenomeLegendComponent } from '../../ui/genome-legend/genome-legend.component';
import { GenomeFacade } from '../state/genome.facade';

/**
 * Overlay des Genom-Modus (Mockup K2-K): Titel oben Mitte mit DNA, Zahl verfügbarer Adaptionen und
 * Legende; rechts das Detailpanel zum gewählten Knoten.
 */
@Component({
  selector: 'app-genome-overlay',
  imports: [FormatDownPipe, FormatNumPipe, GenomeDetailComponent, GenomeLegendComponent],
  templateUrl: './genome-overlay.component.html',
  host: { class: 'block' },
})
export class GenomeOverlayComponent {
  facade = inject(GenomeFacade);
}
