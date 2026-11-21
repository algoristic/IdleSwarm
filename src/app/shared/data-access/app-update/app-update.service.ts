import { inject, Injectable, linkedSignal, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SwUpdate, VersionEvent } from '@angular/service-worker';

import { PAGE_RELOAD } from '../platform/platform.tokens';

/**
 * Updates der PWA (US-07.06, TK §11): meldet, wenn der Service Worker eine neue Version geladen hat,
 * und lädt die Seite auf Wunsch neu. Ohne Service Worker (Dev-Server, Tests ohne
 * `provideServiceWorker`) bleibt `updateReady` `false`.
 */
@Injectable()
export class AppUpdateService {
  readonly #swUpdate = inject(SwUpdate, { optional: true });
  readonly #reload = inject(PAGE_RELOAD);

  // `SwUpdate` liefert Observables; sofort als Signal (CLAUDE.md §6). Ist der Service Worker aus,
  // sendet `versionUpdates` nie.
  readonly #lastEvent: Signal<VersionEvent | null> =
    this.#swUpdate === null
      ? signal(null)
      : toSignal(this.#swUpdate.versionUpdates, { initialValue: null });

  /** Eine neue Version liegt bereit; bleibt gesetzt, bis die Seite neu lädt. */
  updateReady = linkedSignal<VersionEvent | null, boolean>({
    source: this.#lastEvent,
    computation: (event, previous) => (previous?.value ?? false) || event?.type === 'VERSION_READY',
  }).asReadonly();

  /** Lädt die Seite neu; der Service Worker liefert dabei die neue Version aus. */
  reload(): void {
    this.#reload.reload();
  }
}
