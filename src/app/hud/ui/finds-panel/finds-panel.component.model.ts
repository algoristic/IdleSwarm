import type { ValueEffectTarget } from '@app/balance/domain/models/effect.model';
import type {
  CollectionProgress,
  DrawerFragments,
  DrawerSet,
} from '@app/finds/domain/models/collection.model';
import type { BuffId } from '@app/finds/domain/models/finds.model';
import type { Num } from '@app/shared/util/num/num';

/** Bonus eines Badges als Änderung in Prozent, ohne Vorzeichen (Game-Design §4.17). */
export interface BadgeBonusView {
  readonly target: ValueEffectTarget;
  /** Senkt der Bonus den Wert (`mul < 1`, z. B. Kampfverluste)? */
  readonly lowers: boolean;
  readonly percent: number;
}

export interface FindsSetView extends DrawerSet {
  readonly bonus: BadgeBonusView;
}

export interface BuffView {
  readonly id: BuffId;
  readonly secondsLeft: Num;
}

export interface FindsView {
  readonly progress: CollectionProgress;
  readonly sets: readonly FindsSetView[];
  readonly fragments: readonly DrawerFragments[];
  /** Laufende Buffs in der Reihenfolge der Fundtabelle. */
  readonly buffs: readonly BuffView[];
}
