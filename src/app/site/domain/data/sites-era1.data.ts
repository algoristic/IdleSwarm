/**
 * Stabile IDs der Futterstellentypen; Spielstände speichern sie, also nicht umbenennen. Die
 * Reihenfolge ist die der Typtabelle und damit die der gewichteten Ziehung (Game-Design §2.3, §4.6).
 */
export const SITE_TYPE_IDS = [
  'algal-mat',
  'vent',
  'bacterial-mat',
  'methane-seep',
  'whale-fall',
] as const;

export type SiteTypeId = (typeof SITE_TYPE_IDS)[number];

export interface SiteTypeDefinition {
  readonly id: SiteTypeId;
}

export const SITE_TYPES_ERA1: readonly SiteTypeDefinition[] = Object.freeze(
  SITE_TYPE_IDS.map((id) => Object.freeze({ id })),
);

/** Typ der ersten Futterstelle (Game-Design §2.1). */
export const START_SITE_TYPE: SiteTypeId = 'vent';

/** Einziger Typ mit Abwehr 0; der Generator garantiert ihn in Reichweite (Game-Design §4.6). */
export const SAFE_SITE_TYPE: SiteTypeId = 'algal-mat';

export function isSiteTypeId(value: unknown): value is SiteTypeId {
  return (SITE_TYPE_IDS as readonly unknown[]).includes(value);
}
