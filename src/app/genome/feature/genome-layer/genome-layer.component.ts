import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { TREE_SIZE } from '../../domain/genome-tree-logic';
import { GenomeTreeComponent } from '../../ui/genome-tree/genome-tree.component';
import { GENOME_TREE_MIN_SIZE } from '../../ui/genome-tree/genome-tree.layout';
import { GenomeFacade } from '../state/genome.facade';

/**
 * Genom-Ebene der Shell: der Baum im Zellkern in der Größe `--ms`, zentriert im Viewport. Auf dem
 * Smartphone wird er mindestens {@link GENOME_TREE_MIN_SIZE} groß und verschiebbar (CSS). Misst die
 * gerenderte Größe, damit der Baum Schrift und Trefferflächen daran anpasst.
 */
@Component({
  selector: 'app-genome-layer',
  imports: [GenomeTreeComponent],
  templateUrl: './genome-layer.component.html',
  styleUrl: './genome-layer.component.css',
  host: { class: 'block' },
})
export class GenomeLayerComponent implements AfterViewInit {
  facade = inject(GenomeFacade);
  readonly #destroyRef = inject(DestroyRef);

  minSize = GENOME_TREE_MIN_SIZE;

  viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');
  stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** Gerenderte Pixel je `viewBox`-Einheit; lokaler UI-Zustand, ohne Messung 1. */
  scale = signal(1);

  ngAfterViewInit(): void {
    const stage = this.stage().nativeElement;
    const viewport = this.viewport().nativeElement;
    const measure = (): void => {
      const width = stage.clientWidth;
      if (width > 0) {
        this.scale.set(width / TREE_SIZE);
      }
      // Ragt der Baum über (Smartphone), startet die Ansicht auf dem Zellkern.
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(stage);
    this.#destroyRef.onDestroy(() => observer?.disconnect());
  }
}
