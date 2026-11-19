import { computed, DestroyRef, inject, Injectable, Signal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';

import { VIEWPORT } from '@app/shared/data-access/platform/platform.tokens';

import type { ShellMode, ViewportSize, ZoomDirection } from '../../domain/models/shell-mode.model';
import { neighborMode, SHELL_MODE_PATHS } from '../../domain/shell-mode-logic';
import type { ShellLayoutView } from './shell.model';
import { shellModeFromUrl, toShellLayout } from './shell.utils';

/** Zugang der Shell: Modus aus der Route, Wechsel per Navigation, Kamera aus dem Viewport. */
@Injectable()
export class ShellFacade {
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

  mode = computed<ShellMode>(() => shellModeFromUrl(this.#url()));
  layout = computed<ShellLayoutView>(() => toShellLayout(this.mode(), this.#viewportSize()));

  setMode(mode: ShellMode): void {
    void this.#router.navigateByUrl(`/${SHELL_MODE_PATHS[mode]}`);
  }

  /** Eine Zoomstufe weiter (Mausrad); am Ende der Reihe passiert nichts. */
  zoom(direction: ZoomDirection): void {
    const next = neighborMode(this.mode(), direction);
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
