import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';

import { TICK_MS } from '@app/balance/domain/constants';
import { ANIMATION_FRAME, CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import { syncClock } from '../../domain/step-logic';
import { GameStore } from '../game-store/game-store.service';

/** Bis zu so vielen Ticks (60 s) je Aufwachen läuft der Takt Tick für Tick. */
export const MAX_TICKS_PER_WAKE = 600;

/** Wird je Frame aufgerufen; `alpha` (0 bis 1) ist der Anteil am aktuellen Tick. */
export type RenderCallback = (alpha: number) => void;

/** Treibt den festen Logik-Takt und, davon getrennt, den Render-Takt. */
@Injectable()
export class GameLoop {
  readonly #store = inject(GameStore);
  readonly #document = inject(DOCUMENT);
  readonly #clock = inject(CLOCK);
  readonly #animationFrame = inject(ANIMATION_FRAME);

  readonly #renderCallbacks = new Set<RenderCallback>();
  #timer: ReturnType<typeof setInterval> | null = null;
  #frame: number | null = null;
  #lastWake = 0;
  #accumulator = 0;

  readonly #onVisibilityChange = (): void => this.#syncRendering();

  readonly #onFrame = (): void => {
    this.#frame = null;
    // Zuerst neu anfordern, damit ein werfender Callback den Render-Takt nicht beendet.
    this.#syncRendering();
    const elapsed = this.#accumulator + Math.max(0, this.#clock.monotonic() - this.#lastWake);
    const alpha = Math.min(elapsed / TICK_MS, 1);
    for (const callback of [...this.#renderCallbacks]) {
      if (this.#renderCallbacks.has(callback)) {
        callback(alpha);
      }
    }
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(): void {
    if (this.#timer !== null) {
      return;
    }
    // Die Zeit bis zum Start zählt nicht als Spielzeit, die Uhr muss sie aber kennen.
    this.#store.replace(syncClock(this.#store.state(), this.#clock.now()));
    this.#lastWake = this.#clock.monotonic();
    this.#accumulator = 0;
    this.#timer = setInterval(() => this.#advance(), TICK_MS);
    this.#document.addEventListener('visibilitychange', this.#onVisibilityChange);
    this.#syncRendering();
  }

  stop(): void {
    if (this.#timer === null) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = null;
    this.#document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    this.#syncRendering();
  }

  /** Meldet einen Render-Callback an; er darf den Zustand nicht ändern. */
  onRender(callback: RenderCallback): () => void {
    // Eigener Eintrag je Anmeldung, damit dieselbe Funktion mehrfach angemeldet sein kann.
    const entry: RenderCallback = (alpha) => callback(alpha);
    this.#renderCallbacks.add(entry);
    this.#syncRendering();
    return () => {
      this.#renderCallbacks.delete(entry);
      this.#syncRendering();
    };
  }

  #advance(): void {
    const now = this.#clock.monotonic();
    this.#accumulator += Math.max(0, now - this.#lastWake);
    this.#lastWake = now;

    const due = Math.floor(this.#accumulator / TICK_MS);
    if (due > MAX_TICKS_PER_WAKE) {
      this.#catchUp(due * TICK_MS);
      return;
    }
    this.#accumulator -= due * TICK_MS;
    for (let i = 0; i < due; i++) {
      this.#store.tick(TICK_MS);
    }
  }

  /**
   * Holt einen großen Rückstand wie den Offline-Fortschritt nach (`GameStore.catchUp`, grobe
   * Schritte, höchstens `T_max`). Über `T_max` hinaus verfällt die Zeit; dann wird die Uhr
   * abgeglichen und der Akkumulator geleert.
   */
  #catchUp(backlogMs: number): void {
    const { capped } = this.#store.catchUp(backlogMs, 'background');
    if (capped) {
      this.#accumulator = 0;
      this.#store.replace(syncClock(this.#store.state(), this.#clock.now()));
    } else {
      this.#accumulator -= backlogMs;
    }
  }

  /** Der Render-Takt läuft nur mit Logik-Takt, Callbacks und sichtbarer Seite. */
  #syncRendering(): void {
    const shouldRun =
      this.#timer !== null && this.#renderCallbacks.size > 0 && !this.#document.hidden;
    if (shouldRun && this.#frame === null) {
      this.#frame = this.#animationFrame.request(this.#onFrame);
    } else if (!shouldRun && this.#frame !== null) {
      this.#animationFrame.cancel(this.#frame);
      this.#frame = null;
    }
  }
}
