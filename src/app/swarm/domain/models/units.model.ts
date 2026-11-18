import type { Num } from '@app/shared/util/num/num';

/** Stabile IDs der Einheitentypen; Spielstände speichern sie als Schlüssel, also nicht umbenennen. */
export const UNIT_TYPES = ['queens', 'drones', 'soldiers'] as const;

export type UnitType = (typeof UNIT_TYPES)[number];

export interface Units {
  readonly queens: Num;
  readonly drones: Num;
  readonly soldiers: Num;
}
