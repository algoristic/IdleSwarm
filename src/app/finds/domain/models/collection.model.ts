import type { UniqueAdaptationId } from '@app/genome/domain/models/genome.model';

import type { CollectibleId, CollectionSetId, FragmentId } from './finds.model';

/** Fortschritt `found / total` (Game-Design §4.17, US-06.04). */
export interface CollectionProgress {
  readonly found: number;
  readonly total: number;
}

/** Feld der Schublade „Funde“: ein Sammelobjekt oder ein Fragment; unbekannt erscheint als „?“. */
export interface DrawerField<Id> {
  readonly id: Id;
  readonly known: boolean;
}

/** Set der Schublade mit x / 3 und Badge (Game-Design §4.17). */
export interface DrawerSet {
  readonly id: CollectionSetId;
  readonly progress: CollectionProgress;
  /** Set vollständig, das Badge wirkt. */
  readonly badge: boolean;
  readonly fields: readonly DrawerField<CollectibleId>[];
}

/** Fragmente einer einzigartigen Adaption mit x / benötigt; ein Feld je benötigtem Fragment. */
export interface DrawerFragments {
  readonly adaptation: UniqueAdaptationId;
  readonly fragment: FragmentId;
  readonly progress: CollectionProgress;
  readonly unlocked: boolean;
  readonly fields: readonly DrawerField<FragmentId>[];
}

/** Inhalt der Schublade „Funde“ (US-06.04), rein aus dem Fundzustand abgeleitet. */
export interface FindsDrawer {
  /** x / y gesamt; v1 y = 12 + Σ benötigte Fragmente = 24. */
  readonly progress: CollectionProgress;
  readonly sets: readonly DrawerSet[];
  readonly fragments: readonly DrawerFragments[];
}
