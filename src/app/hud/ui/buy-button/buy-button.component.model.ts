import type { Num } from '@app/shared/util/num/num';
import type { UnitType } from '@app/swarm/domain/models/units.model';

export interface QueenEffectView {
  readonly eggsPerMin: Num;
  readonly space: Num;
}

export interface UnitView {
  readonly id: UnitType;
  readonly count: Num;
  /** Preis auf Anzeigegenauigkeit; bei einem kaufbaren Knopf nie über der angezeigten Nahrung. */
  readonly price: Num;
  readonly affordable: boolean;
  readonly queenEffect: QueenEffectView | null;
}
