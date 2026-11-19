import { Component, inject, input, linkedSignal, signal } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { GenomeDetailComponent } from '../../ui/genome-detail/genome-detail.component';
import { GenomeLegendComponent } from '../../ui/genome-legend/genome-legend.component';
import { GenomeFacade } from '../state/genome.facade';

/**
 * Overlay des Genom-Modus (Mockup K2-K): Titel oben Mitte mit DNA, Zahl verfügbarer Adaptionen und
 * Legende; rechts das Detailpanel zum gewählten Knoten. Auf dem Smartphone (< 768 px) ist der Titel
 * kompakt (Legende aufklappbar) und das Detailpanel ein Bottom-Sheet mit ein-/ausklappbarem Kopf.
 */
@Component({
  selector: 'app-genome-overlay',
  imports: [FormatDownPipe, FormatNumPipe, GenomeDetailComponent, GenomeLegendComponent],
  templateUrl: './genome-overlay.component.html',
  styleUrl: './genome-overlay.component.css',
  host: { class: 'block' },
})
export class GenomeOverlayComponent {
  facade = inject(GenomeFacade);

  /** Genom-Modus aktiv; beim Wechsel klappt das Bottom-Sheet wieder ein (wie die Schubladen). */
  active = input(true);

  /** Lokaler UI-Zustand, nur auf dem Smartphone wirksam: Legende und Bottom-Sheet aufgeklappt. */
  legendOpen = signal(false);
  sheetOpen = linkedSignal({ source: this.active, computation: () => false });

  onToggleLegend(): void {
    this.legendOpen.update((open) => !open);
  }

  onToggleSheet(): void {
    this.sheetOpen.update((open) => !open);
  }
}
