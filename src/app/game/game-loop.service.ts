import { DestroyRef, DOCUMENT, inject, Injectable } from '@angular/core';

import { TICK_MS } from '../core/balance/constants';
import { syncClock } from '../core/sim/step';
import { GameStoreService } from './game-store.service';

/** Höchstens so viele Ticks (60 s) werden pro Aufwachen nachgeholt. */
export const MAX_TICKS_PER_WAKE = 600;

/** Wird je Frame aufgerufen; `alpha` (0 bis 1) ist der Anteil am aktuellen Tick. */
export type RenderCallback = (alpha: number) => void;

/** Treibt den festen Logik-Takt und, davon getrennt, den Render-Takt. */
@Injectable({ providedIn: 'root' })
export class GameLoopService {
  private readonly store = inject(GameStoreService);
  private readonly document = inject(DOCUMENT);

  private readonly renderCallbacks = new Set<RenderCallback>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private frame: number | null = null;
  private lastWake = 0;
  private accumulator = 0;

  private readonly onVisibilityChange = (): void => this.syncRendering();

  private readonly onFrame = (): void => {
    this.frame = null;
    // Zuerst neu anfordern, damit ein werfender Callback den Render-Takt nicht beendet.
    this.syncRendering();
    const elapsed = this.accumulator + Math.max(0, performance.now() - this.lastWake);
    const alpha = Math.min(elapsed / TICK_MS, 1);
    for (const callback of [...this.renderCallbacks]) {
      if (this.renderCallbacks.has(callback)) {
        callback(alpha);
      }
    }
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(): void {
    if (this.timer !== null) {
      return;
    }
    // Die Zeit bis zum Start zählt nicht als Spielzeit, die Uhr muss sie aber kennen.
    this.store.replace(syncClock(this.store.state(), Date.now()));
    this.lastWake = performance.now();
    this.accumulator = 0;
    this.timer = setInterval(() => this.advance(), TICK_MS);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.syncRendering();
  }

  stop(): void {
    if (this.timer === null) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.syncRendering();
  }

  /** Meldet einen Render-Callback an; er darf den Zustand nicht ändern. */
  onRender(callback: RenderCallback): () => void {
    // Eigener Eintrag je Anmeldung, damit dieselbe Funktion mehrfach angemeldet sein kann.
    const entry: RenderCallback = (alpha) => callback(alpha);
    this.renderCallbacks.add(entry);
    this.syncRendering();
    return () => {
      this.renderCallbacks.delete(entry);
      this.syncRendering();
    };
  }

  private advance(): void {
    const now = performance.now();
    this.accumulator += Math.max(0, now - this.lastWake);
    this.lastWake = now;

    const due = Math.floor(this.accumulator / TICK_MS);
    const capped = due > MAX_TICKS_PER_WAKE;
    const ticks = capped ? MAX_TICKS_PER_WAKE : due;
    this.accumulator = capped ? 0 : this.accumulator - ticks * TICK_MS;

    for (let i = 0; i < ticks; i++) {
      this.store.tick(TICK_MS);
    }
    if (capped) {
      this.store.replace(syncClock(this.store.state(), Date.now()));
    }
  }

  /** Der Render-Takt läuft nur mit Logik-Takt, Callbacks und sichtbarer Seite. */
  private syncRendering(): void {
    const shouldRun = this.timer !== null && this.renderCallbacks.size > 0 && !this.document.hidden;
    if (shouldRun && this.frame === null) {
      this.frame = requestAnimationFrame(this.onFrame);
    } else if (!shouldRun && this.frame !== null) {
      cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }
}
