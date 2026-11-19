import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { GameLoop } from '@app/engine/data-access/game-loop/game-loop.service';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { CLOCK, VIEWPORT } from '@app/shared/data-access/platform/platform.tokens';

import type { SceneFrame } from '../../domain/models/scene.model';
import type { ScenePopupView } from './scene.model';
import { SCENE_DISPLAY } from './scene.tokens';
import { toSceneFrame, toScenePopups } from './scene.utils';

interface DisplaySize {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
}

/** Zugang der Szene zum Spielkern: Frame-Daten, Ereigniszahlen und Render-Takt. */
@Injectable()
export class SceneFacade {
  readonly #store = inject(GameStore);
  readonly #loop = inject(GameLoop);
  readonly #clock = inject(CLOCK);
  readonly #viewport = inject(VIEWPORT);
  readonly #display = inject(SCENE_DISPLAY);
  readonly #destroyRef = inject(DestroyRef);

  readonly #size = this.#watchSize();
  readonly #coarsePointer = this.#display.coarsePointer();
  // Ereignisse vor dem Start der Szene (etwa beim Laden) zeigen keine Zahlen.
  readonly #popupsAfterId = this.#store.log().at(-1)?.id ?? -1;

  /** Hook für „Partikel reduzieren“; die Einstellung dazu kommt mit AP 1.4.6. */
  reduceParticles = signal(false);

  /** Wird nur im Render-Takt gelesen, nicht im Template. */
  frame = computed<SceneFrame>(() => {
    const size = this.#size();
    return toSceneFrame(
      {
        state: this.#store.state(),
        width: size.width,
        height: size.height,
        devicePixelRatio: size.pixelRatio,
        coarsePointer: this.#coarsePointer,
        reduceParticles: this.reduceParticles(),
      },
      DEFAULT_BALANCE,
    );
  });

  popups = computed<ScenePopupView[]>(() => toScenePopups(this.#store.log(), this.#popupsAfterId));

  /** Monotone Zeit für die Animation (nicht die Spielzeit). */
  now(): number {
    return this.#clock.monotonic();
  }

  /**
   * Meldet einen Callback im Render-Takt des GameLoop an; die Rückgabe meldet ab. Der GameLoop
   * pausiert ihn bei verborgener Seite.
   */
  onRender(callback: () => void): () => void {
    return this.#loop.onRender(() => callback());
  }

  #watchSize(): Signal<DisplaySize> {
    const read = (): DisplaySize => ({
      width: this.#viewport.width(),
      height: this.#viewport.height(),
      pixelRatio: this.#display.pixelRatio(),
    });
    const size = signal(read());
    const stop = this.#viewport.onResize(() => size.set(read()));
    this.#destroyRef.onDestroy(stop);
    return size.asReadonly();
  }
}
