import { computed, inject, Injectable } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import type { HudView } from './hud.model';
import { toHudView } from './hud.utils';

/** Zugang des HUD zum Spielkern: Viewmodel und Befehle. */
@Injectable()
export class HudFacade {
  readonly #store = inject(GameStore);
  readonly #persistence = inject(PersistenceService);

  hud = computed<HudView>(() =>
    toHudView(
      {
        state: this.#store.state(),
        notice: this.#persistence.notice(),
        lastSaveError: this.#persistence.lastSaveError(),
        lastSavedAt: this.#persistence.lastSavedAt(),
      },
      DEFAULT_BALANCE,
    ),
  );

  buy(unit: UnitType): void {
    this.#store.dispatch({ type: 'buy', unit });
  }
}
