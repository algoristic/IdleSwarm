import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

import type { GenomeDetailView } from '../../ui/genome-detail/genome-detail.component.model';
import type { GenomeTreeView } from '../../ui/genome-tree/genome-tree.component.model';
import type { GenomeEntryId } from '../../ui/models/genome-entry.model';

/** Was die Genom-Ansicht liest; `selected` ist lokaler UI-Zustand der Facade, nicht im Spielstand. */
export interface GenomeSource {
  readonly state: GameState;
  /** Vom Spieler gewählter Eintrag; `null` wählt einen sinnvollen Standard. */
  readonly selected: GenomeEntryId | null;
}

export interface GenomeView {
  readonly dna: Num;
  /** Knoten mit Status `available` (US-05.04). */
  readonly availableCount: number;
  /** Eintrag im Detailpanel: die Wahl des Spielers, sonst der erste verfügbare bzw. zu teure Knoten, sonst die Wurzel. */
  readonly selected: GenomeEntryId;
  readonly tree: GenomeTreeView;
  readonly detail: GenomeDetailView;
}
