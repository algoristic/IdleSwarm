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
