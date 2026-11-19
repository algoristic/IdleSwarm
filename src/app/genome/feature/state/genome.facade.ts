import { computed, inject, Injectable, signal } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';

import type { GenomeNodeId } from '../../domain/models/genome.model';
import type { GenomeEntryId } from '../../ui/models/genome-entry.model';
import type { GenomeView } from './genome.model';
import { toGenomeView } from './genome.utils';

/** Zugang der Genom-Ansicht zum Spielkern: Viewmodel, Auswahl und Entwickeln. */
@Injectable()
export class GenomeFacade {
  readonly #store = inject(GameStore);

  readonly #selected = signal<GenomeEntryId | null>(null);

  genome = computed<GenomeView>(() =>
    toGenomeView({ state: this.#store.state(), selected: this.#selected() }, DEFAULT_BALANCE),
  );

  select(id: GenomeEntryId): void {
    this.#selected.set(id);
  }

  evolve(node: GenomeNodeId): void {
    this.#store.dispatch({ type: 'evolve', node });
  }
}
