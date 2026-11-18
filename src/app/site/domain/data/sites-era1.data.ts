/** Stabile IDs der Futterstellentypen; Spielstände speichern sie, also nicht umbenennen. */
export const SITE_TYPE_IDS = ['vent'] as const;

export type SiteTypeId = (typeof SITE_TYPE_IDS)[number];

export interface SiteTypeDefinition {
  readonly id: SiteTypeId;
}

export const SITE_TYPES_ERA1: readonly SiteTypeDefinition[] = Object.freeze([
  Object.freeze({ id: 'vent' }),
]);

/** Typ der ersten Futterstelle (Game-Design §2.1). */
export const START_SITE_TYPE: SiteTypeId = 'vent';

export function isSiteTypeId(value: unknown): value is SiteTypeId {
  return (SITE_TYPE_IDS as readonly unknown[]).includes(value);
}
