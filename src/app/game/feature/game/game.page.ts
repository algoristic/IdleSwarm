import { Component, computed, DestroyRef, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';

import { ToastStackComponent } from '@app/shared/ui/toast-stack/toast-stack.component';

import { CatchUpOverlayComponent } from '../../ui/catch-up-overlay/catch-up-overlay.component';
import { ChipsComponent } from '../../ui/chips/chips.component';
import { GameToastComponent } from '../../ui/game-toast/game-toast.component';
import { HudComponent } from '../../ui/hud/hud.component';
import { MapContextComponent } from '../../ui/map-context/map-context.component';
import { MenuButtonComponent } from '../../ui/menu-button/menu-button.component';
import { SwarmContextComponent } from '../../ui/swarm-context/swarm-context.component';
import { UpgradesContextComponent } from '../../ui/upgrades-context/upgrades-context.component';
import { ViewNavComponent } from '../../ui/view-nav/view-nav.component';
import { DialogMenuComponent } from '../dialog-menu/dialog-menu.component';
import { GameFacade } from '../state/game.facade';
import { GameViewId } from '../state/game.model';
import { isGameView } from '../state/game.utils';

@Component({
  selector: 'app-game-page',
  imports: [
    CatchUpOverlayComponent,
    ChipsComponent,
    DialogMenuComponent,
    GameToastComponent,
    HudComponent,
    MapContextComponent,
    MenuButtonComponent,
    RouterOutlet,
    SwarmContextComponent,
    ToastStackComponent,
    UpgradesContextComponent,
    ViewNavComponent,
  ],
  templateUrl: './game.page.html',
  styleUrl: './game.page.css',
  host: { class: 'flex h-dvh justify-center sm:items-center' },
})
export class GamePage {
  facade = inject(GameFacade);
  readonly #router = inject(Router);
  readonly #route = inject(ActivatedRoute);
  readonly #destroyRef = inject(DestroyRef);

  activeView = toSignal(
    this.#router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.#currentView()),
    ),
    { initialValue: this.#currentView() },
  );
  context = computed(() => {
    const view = this.facade.view();
    switch (this.activeView()) {
      case 'swarm':
        return { view: 'swarm', swarm: view.swarm } as const;
      case 'map':
        return { view: 'map', map: view.map } as const;
      case 'upgrades':
        return { view: 'upgrades', upgrades: view.upgrades } as const;
    }
  });

  constructor() {
    this.facade.start();
    this.#destroyRef.onDestroy(() => this.facade.leave());
  }

  onOpenMenu(): void {
    this.facade.openMenu();
  }

  onToastExpired(id: number): void {
    this.facade.dismissToast(id);
  }

  #currentView(): GameViewId {
    const view: unknown = this.#route.snapshot.firstChild?.data['view'];
    return isGameView(view) ? view : 'swarm';
  }
}
