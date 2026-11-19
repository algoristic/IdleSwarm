import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { MAP_SIZE } from '../../domain/sonar-map-logic';
import { SonarMapComponent } from '../../ui/sonar-map/sonar-map.component';
import { SonarFacade } from '../state/sonar.facade';

/**
 * Karten-Ebene der Shell: die Sonar-Karte in der Größe `--ms`, zentriert auf die eigene Position.
 * Misst die gerenderte Größe, damit die Karte Schrift und Trefferflächen daran anpasst.
 */
@Component({
  selector: 'app-sonar-layer',
  imports: [SonarMapComponent],
  templateUrl: './sonar-layer.component.html',
  styleUrl: './sonar-layer.component.css',
  host: { class: 'block' },
})
export class SonarLayerComponent implements AfterViewInit {
  facade = inject(SonarFacade);
  readonly #destroyRef = inject(DestroyRef);

  stage = viewChild.required<ElementRef<HTMLElement>>('stage');

  /** Gerenderte Pixel je `viewBox`-Einheit; lokaler UI-Zustand, ohne Messung 1. */
  scale = signal(1);

  ngAfterViewInit(): void {
    const element = this.stage().nativeElement;
    const measure = (): void => {
      const width = element.clientWidth;
      if (width > 0) {
        this.scale.set(width / MAP_SIZE);
      }
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(element);
    this.#destroyRef.onDestroy(() => observer?.disconnect());
  }
}
