import {
  afterNextRender,
  Component,
  DestroyRef,
  DOCUMENT,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { readScenePalette } from '../../ui/scene-canvas/scene-palette';
import { SceneRenderer } from '../../ui/scene-canvas/scene-renderer';
import { SceneFacade } from '../state/scene.facade';
import type { ScenePopupSlot } from '../state/scene.model';

/**
 * Welt-Ebene der K2-Shell (US-08.02): Szene-Canvas im Render-Takt des GameLoop, darüber die
 * Ereigniszahlen als DOM-Elemente (nur im Szenen-Modus sichtbar).
 */
@Component({
  selector: 'app-scene-world',
  imports: [FormatNumPipe],
  templateUrl: './scene-world.component.html',
  styleUrl: './scene-world.component.css',
  host: { class: 'block' },
})
export class SceneWorldComponent {
  facade = inject(SceneFacade);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  popupSlotClasses: Record<ScenePopupSlot, string> = {
    0: '-left-20',
    1: 'left-0',
    2: 'left-20',
  };

  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');

  constructor() {
    afterNextRender(() => this.#startRendering());
  }

  #startRendering(): void {
    const view = this.#document.defaultView;
    if (!view) {
      return;
    }
    // Farben einmal beim Start aus den Tokens; ein Themenwechsel ist nicht geplant.
    const palette = readScenePalette(view.getComputedStyle(this.#document.documentElement));
    const renderer = SceneRenderer.create(this.canvas().nativeElement, palette, (width, height) => {
      const canvas = this.#document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      return canvas;
    });
    if (!renderer) {
      return;
    }
    const stop = this.facade.onRender(() => renderer.draw(this.facade.now(), this.facade.frame()));
    this.#destroyRef.onDestroy(stop);
  }
}
