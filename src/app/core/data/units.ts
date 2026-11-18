/** Stabile IDs der Einheitentypen; Spielstände speichern sie als Schlüssel, also nicht umbenennen. */
export const UNIT_TYPES = ['queens', 'drones', 'soldiers'] as const;

export type UnitType = (typeof UNIT_TYPES)[number];
