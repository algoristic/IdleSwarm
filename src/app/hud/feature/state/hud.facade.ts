import { computed, inject, Injectable } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { PersistenceService } from '@app/persistence/data-access/persistence/persistence.service';
import { NUMBER_NOTATION } from '@app/shared/ui/pipes/number-notation/number-notation.token';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import type { PheromoneDistribution } from '../../ui/pheromone-panel/pheromone-panel.component.model';
import type { HudView } from './hud.model';
import { toHudView, toLogView, toReturnSummaryView } from './hud.utils';

/** Zugang des HUD zum Spielkern: Viewmodel und Befehle. */
@Injectable()
export class HudFacade {
  readonly #store = inject(GameStore);
  readonly #persistence = inject(PersistenceService);
  readonly #notation = inject(NUMBER_NOTATION);

  hud = computed<HudView>(() =>
    toHudView(
      {
        state: this.#store.state(),
        notice: this.#persistence.notice(),
        lastSaveError: this.#persistence.lastSaveError(),
        lastSavedAt: this.#persistence.lastSavedAt(),
        notation: this.#notation(),
      },
      DEFAULT_BALANCE,
    ),
  );

  /** Eigenes Signal, damit das Log nicht mit jedem Tick neu abgebildet wird. */
  log = computed(() => toLogView(this.#store.log()));

  /** Rückkehr-Zusammenfassung ab 5 min Abwesenheit, bis sie quittiert ist; sonst `null`. */
  returnSummary = computed(() => toReturnSummaryView(this.#store.lastCatchUp()));

  buy(unit: UnitType): void {
    this.#store.dispatch({ type: 'buy', unit });
  }

  sacrificeDrones(count: number): void {
    this.#store.dispatch({ type: 'sacrificeDrones', count });
  }

  setPheromones({ drones, soldiers }: PheromoneDistribution): void {
    this.#store.dispatch({ type: 'setPheromones', drones, soldiers });
  }

  strengthenGland(): void {
    this.#store.dispatch({ type: 'strengthenGland' });
  }

  acknowledgeReturnSummary(): void {
    this.#store.acknowledgeCatchUp();
  }
}
