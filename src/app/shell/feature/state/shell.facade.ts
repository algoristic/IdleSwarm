import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { VIEWPORT } from '@app/shared/data-access/platform/platform.tokens';

import type { ShellMode, ViewportSize, ZoomDirection } from '../../domain/models/shell-mode.model';
import { neighborMode, SHELL_MODE_PATHS, unlockedModes } from '../../domain/shell-mode-logic';
import type { ShellLayoutView } from './shell.model';
import { shellModeFromUrl, toShellLayout } from './shell.utils';

/**
 * Zugang der Shell: Modus aus der Route, Wechsel per Navigation unter den freigeschalteten Modi
 * (US-09.04), Kamera aus dem Viewport.
 */
@Injectable()
export class ShellFacade {
  readonly #store = inject(GameStore);
  readonly #router = inject(Router);
  readonly #viewport = inject(VIEWPORT);
  readonly #destroyRef = inject(DestroyRef);

  // Während der ersten Navigation steht das Ziel nur in `currentNavigation`, noch nicht in `url`.
  readonly #url = toSignal(
    this.#router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.#router.parseUrl(this.#router.url)),
    ),
    {
      initialValue:
        this.#router.currentNavigation()?.finalUrl ?? this.#router.parseUrl(this.#router.url),
    },
  );
  readonly #viewportSize = this.#watchViewport();

  /** Neue Referenz nur bei einer Freischaltung, nicht mit jedem Tick. */
  readonly #onboarding = computed(() => this.#store.state().onboarding);

  mode = computed<ShellMode>(() => shellModeFromUrl(this.#url()));
  /** Erreichbare Modi in Zoom-Reihenfolge; die Szene immer. */
  modes = computed<readonly ShellMode[]>(() => unlockedModes(this.#onboarding()));
  layout = computed<ShellLayoutView>(() => toShellLayout(this.mode(), this.#viewportSize()));

  isModeUnlocked(mode: ShellMode): boolean {
    return this.modes().includes(mode);
  }

  /** Wechselt in den Modus; ein gesperrter Modus bleibt unerreichbar. */
  setMode(mode: ShellMode): void {
    if (!this.isModeUnlocked(mode)) {
      return;
    }
    void this.#router.navigateByUrl(`/${SHELL_MODE_PATHS[mode]}`);
  }

  /** Eine Zoomstufe weiter (Mausrad, Pinch), gesperrte übersprungen; am Ende passiert nichts. */
  zoom(direction: ZoomDirection): void {
    const next = neighborMode(this.mode(), direction, this.modes());
    if (next) {
      this.setMode(next);
    }
  }

  #watchViewport(): Signal<ViewportSize> {
    const read = (): ViewportSize => ({
      width: this.#viewport.width(),
      height: this.#viewport.height(),
    });
    const size = signal(read());
    const stop = this.#viewport.onResize(() => size.set(read()));
    this.#destroyRef.onDestroy(stop);
    return size.asReadonly();
  }
}
