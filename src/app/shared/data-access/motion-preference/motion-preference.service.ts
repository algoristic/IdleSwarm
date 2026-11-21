import { computed, DestroyRef, DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';

import { MOTION_OVERRIDE, PREFERS_REDUCED_MOTION } from './motion-preference-service.tokens';

/** Attribut an `<html>`; die Tailwind-Variante `motion-reduced:` und Komponenten-CSS lesen es. */
export const MOTION_ATTRIBUTE = 'data-motion';
export type MotionValue = 'reduced' | 'full';

/**
 * Einzige Quelle für reduzierte Bewegung (US-08.08, TK §8.5): die Systemeinstellung
 * `prefers-reduced-motion`, überschreibbar durch die Einstellung im Spiel (`MOTION_OVERRIDE`). Setzt das
 * Ergebnis als `data-motion` an `<html>`, damit Shell, Modell-Seite und spätere Overlays außerhalb
 * der Shell gleich reagieren.
 */
@Injectable()
export class MotionPreferenceService {
  readonly #media = inject(PREFERS_REDUCED_MOTION);
  readonly #document = inject(DOCUMENT);

  readonly #system = signal(this.#media.matches());

  systemPrefersReduced = this.#system.asReadonly();
  /** Einstellung im Spiel; `null` folgt dem System. */
  override = inject(MOTION_OVERRIDE);
  reducedMotion = computed(() => this.override() ?? this.#system());

  constructor() {
    const stop = this.#media.onChange(() => this.#system.set(this.#media.matches()));
    inject(DestroyRef).onDestroy(stop);
    // Seiteneffekt in den DOM (CLAUDE.md §6): Das Attribut spiegelt das Signal.
    effect(() => {
      const value: MotionValue = this.reducedMotion() ? 'reduced' : 'full';
      this.#document.documentElement.setAttribute(MOTION_ATTRIBUTE, value);
    });
  }
}
