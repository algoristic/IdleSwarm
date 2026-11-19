import type { ValueEffect } from '@app/balance/domain/models/effect.model';
import type { UniqueAdaptationId } from '@app/genome/domain/models/genome.model';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

/** Stabile IDs der Buffs der Fundtabelle (Game-Design §4.16); Spielstände speichern sie. */
export const BUFF_IDS = ['plankton-bloom', 'warm-current'] as const;

export type BuffId = (typeof BUFF_IDS)[number];

/** Stabile IDs der Fragmente in der Reihenfolge der Fundtabelle (Game-Design §4.16). */
export const FRAGMENT_IDS = [
  'thermophile',
  'sulfur-pearl',
  'chloroplast',
  'primal-crystal',
] as const;

export type FragmentId = (typeof FRAGMENT_IDS)[number];

/** Stabile IDs der Sammelobjekte, nach Sets geordnet (Game-Design §4.17). */
export const COLLECTIBLE_IDS = [
  'stromatolite',
  'biofilm-disc',
  'green-pearl',
  'pyrite',
  'basalt-pebble',
  'magnetite',
  'bone-splinter',
  'fat-pearl',
  'tooth-scale',
  'pumice',
  'foam-ball',
  'clay-bead',
] as const;

export type CollectibleId = (typeof COLLECTIBLE_IDS)[number];

/** IDs, die der Fundzustand zählt: Fragmente und Sammelobjekte (Game-Design §5.1). */
export const COLLECTED_IDS = [...FRAGMENT_IDS, ...COLLECTIBLE_IDS] as const;

export type CollectedId = (typeof COLLECTED_IDS)[number];

/** Eintrag „Fremde DNA“: Art DNA, Ersatz für Funde mit erreichtem Ziel (Game-Design §4.16). */
export const FOREIGN_DNA = 'foreign-dna';

/** Eintrag „Nährstoffblase“: Art Nahrung (Game-Design §4.16). */
export const NUTRIENT_BUBBLE = 'nutrient-bubble';

/** Stabile IDs der Einträge der Fundtabelle in Ziehungsreihenfolge (Game-Design §4.16). */
export const FIND_ENTRY_IDS = [
  FOREIGN_DNA,
  NUTRIENT_BUBBLE,
  ...BUFF_IDS,
  ...FRAGMENT_IDS,
  ...COLLECTIBLE_IDS,
] as const;

export type FindEntryId = (typeof FIND_ENTRY_IDS)[number];

/** Fundarten (Game-Design §4.16). */
export const FIND_KINDS = ['dna', 'food', 'buff', 'fragment', 'collectible'] as const;

export type FindKind = (typeof FIND_KINDS)[number];

/** Stabile IDs der Sets; die Badge-ID ist die Set-ID (Game-Design §4.17). */
export const COLLECTION_SET_IDS = ['mat-relics', 'deep-stones', 'whale-relics', 'drift'] as const;

export type CollectionSetId = (typeof COLLECTION_SET_IDS)[number];

/** Auslöser einer Ziehung: Einnahme bei der Ankunft oder Abbau-Schwelle (Game-Design §4.16). */
export const FIND_TRIGGERS = ['arrival', 'harvest'] as const;

export type FindTrigger = (typeof FIND_TRIGGERS)[number];

/**
 * Effekt der Spieldaten ohne Zahl (Buff, Badge): Ziel und Operation. Den Wert liefert `params` über
 * `FIND_ENTRY_PARAMS` bzw. `BADGE_PARAMS` (Game-Design §2.3, Parameter je ID).
 */
export type FindEffectSpec = Omit<ValueEffect, 'value' | 'when'>;

interface FindEntryBase {
  /** Futterstellentypen, an denen der Eintrag gezogen werden kann. */
  readonly sites: readonly SiteTypeId[];
}

/**
 * Eintrag der Fundtabelle (Game-Design §4.16): reine Struktur aus ID, Art, Fundorten und Ziel.
 * Gewichte, Mengen, Faktoren und Dauern stehen in `BalanceParams` (`FIND_ENTRY_PARAMS`).
 */
export type FindEntry =
  | (FindEntryBase & { readonly kind: 'dna'; readonly id: typeof FOREIGN_DNA })
  | (FindEntryBase & { readonly kind: 'food'; readonly id: typeof NUTRIENT_BUBBLE })
  | (FindEntryBase & {
      readonly kind: 'buff';
      readonly id: BuffId;
      /** Buffs wirken nur mit `mul` auf `collectRate`, `broodRate` oder `findChance` (§4.13). */
      readonly effect: FindEffectSpec;
    })
  | (FindEntryBase & { readonly kind: 'fragment'; readonly id: FragmentId })
  | (FindEntryBase & {
      readonly kind: 'collectible';
      readonly id: CollectibleId;
      readonly set: CollectionSetId;
    });

/** Set der Sammlung mit Badge (Game-Design §4.17); die Badge-ID ist die Set-ID. */
export interface CollectionSet {
  readonly id: CollectionSetId;
  readonly items: readonly CollectibleId[];
  readonly sites: readonly SiteTypeId[];
  /** Bonus des Badges; der Wert ist `<setId>BadgeEffect` (`BADGE_PARAMS`). */
  readonly badge: FindEffectSpec;
}

/** Ziel der Fragmente: je Fragment eine einzigartige Adaption (Game-Design §4.14). */
export type FragmentAdaptations = Readonly<Record<FragmentId, UniqueAdaptationId>>;

/** Laufender Buff; je Buff-ID höchstens ein Eintrag (Game-Design §4.16). */
export interface FindBuff {
  readonly id: BuffId;
  /** Ablauf in Spielzeit `time.played` (ms). */
  readonly expiresAtMs: number;
}

/** Gespeicherter Fundzustand (Game-Design §5.1). */
export interface Finds {
  /** Eigener RNG-Strom der Funde (uint32), getrennt vom `rngState` des Generators. */
  readonly rngState: number;
  /** Fundzähler, auch Ersatzfunde zählen. */
  readonly total: number;
  /** Anzahl je gefundenem Fragment bzw. Sammelobjekt; nicht gefundene IDs fehlen. */
  readonly collected: Readonly<Partial<Record<CollectedId, number>>>;
  readonly buffs: readonly FindBuff[];
}

export function isBuffId(value: unknown): value is BuffId {
  return (BUFF_IDS as readonly unknown[]).includes(value);
}

export function isCollectedId(value: unknown): value is CollectedId {
  return (COLLECTED_IDS as readonly unknown[]).includes(value);
}
