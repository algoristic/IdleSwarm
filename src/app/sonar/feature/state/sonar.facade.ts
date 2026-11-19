import { computed, inject, Injectable, linkedSignal } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import type { StrategyId } from '@app/site/domain/models/auto-move.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

import { thresholdFromPercent } from '../../domain/auto-threshold-logic';
import type { SonarView } from './sonar.model';
import { toSonarView } from './sonar.utils';

/** Zugang der Umgebung zum Spielkern: Viewmodel, Auswahl und Befehle zum Weiterziehen. */
@Injectable()
export class SonarFacade {
  readonly #store = inject(GameStore);

  readonly #moves = computed(() => this.#store.state().map.moves);
  /** Nach jeder Ankunft gibt es neue Kandidaten; die alte Auswahl gilt dann nicht mehr. */
  readonly #selected = linkedSignal<number, number | null>({
    source: this.#moves,
    computation: () => null,
  });

  sonar = computed<SonarView>(() =>
    toSonarView({ state: this.#store.state(), selected: this.#selected() }, DEFAULT_BALANCE),
  );

  select(target: number): void {
    this.#selected.set(target);
  }

  depart(target: number): void {
    this.#store.dispatch({ type: 'depart', target });
  }

  setPriority(priority: TransportPriority): void {
    this.#store.dispatch({ type: 'setTransportPriority', priority });
  }

  setStrategy(strategy: StrategyId): void {
    this.#store.dispatch({ type: 'setAutoMove', strategy });
  }

  setAutoEnabled(enabled: boolean): void {
    this.#store.dispatch({ type: 'setAutoMove', enabled });
  }

  setAutoThresholdPercent(percent: number): void {
    this.#store.dispatch({ type: 'setAutoMove', threshold: thresholdFromPercent(percent) });
  }

  convertDronesToQueen(): void {
    this.#store.dispatch({ type: 'convertDronesToQueen' });
  }
}
