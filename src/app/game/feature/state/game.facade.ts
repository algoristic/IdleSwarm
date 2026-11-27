import { computed, inject, Injectable, linkedSignal, signal } from '@angular/core';

import { GameLoopService } from '../../data-access/game-loop/game-loop.service';
import { GAME_CONFIG } from '../../data-access/game-store/game-store-service.tokens';
import { GameStoreService } from '../../data-access/game-store/game-store.service';
import { GameToast } from '../../ui/game-toast/game-toast.model';
import { CollapsedSheets, GameView, GameViewId, ToastQueue } from './game.model';
import {
  advanceToastQueue,
  EMPTY_TOAST_QUEUE,
  removeToast,
  toastCandidates,
  toGameView,
} from './game.utils';

@Injectable()
export class GameFacade {
  readonly #store = inject(GameStoreService);
  readonly #loop = inject(GameLoopService);
  config = inject(GAME_CONFIG);

  readonly #menuOpen = signal(false);
  readonly #collapsedSheets = signal<CollapsedSheets>({
    swarm: false,
    map: false,
    upgrades: false,
  });
  readonly #toastQueue = linkedSignal<readonly GameToast[], ToastQueue>({
    source: () => toastCandidates(this.config, this.#store.loadOutcome(), this.#store.events()),
    computation: (candidates, previous) =>
      advanceToastQueue(previous?.value ?? EMPTY_TOAST_QUEUE, candidates),
  });

  view = computed<GameView>(() =>
    toGameView(this.config, this.#store.state(), this.#loop.tempo(), this.#loop.catchUpProgress()),
  );
  toasts = computed(() => this.#toastQueue().visible);
  menuOpen = this.#menuOpen.asReadonly();
  collapsedSheets = this.#collapsedSheets.asReadonly();

  start(): void {
    this.#loop.start();
  }

  stop(): void {
    this.#loop.stop();
  }

  leave(): void {
    this.stop();
    this.closeMenu();
  }

  dismissToast(id: number): void {
    this.#toastQueue.update((queue) => removeToast(queue, id));
  }

  openMenu(): void {
    this.#menuOpen.set(true);
  }

  closeMenu(): void {
    this.#menuOpen.set(false);
  }

  setSheetCollapsed(view: GameViewId, collapsed: boolean): void {
    this.#collapsedSheets.update((sheets) => ({ ...sheets, [view]: collapsed }));
  }
}
