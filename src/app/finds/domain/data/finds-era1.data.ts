import { UNIQUE_ADAPTATIONS } from '@app/genome/domain/data/genome-era1.data';
import { SITE_TYPE_IDS, SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type {
  CollectibleId,
  CollectionSet,
  CollectionSetId,
  FindEntry,
  FindEntryId,
  FragmentAdaptations,
} from '../models/finds.model';
import { FOREIGN_DNA, NUTRIENT_BUBBLE } from '../models/finds.model';

/** Fundort „alle“: jeder Futterstellentyp der Ära I. */
const ALL_SITES: readonly SiteTypeId[] = SITE_TYPE_IDS;

/**
 * Sets der Sammlung in der Reihenfolge von `COLLECTION_SET_IDS` (Game-Design §4.17). Reine
 * Struktur: Gewichte der Sammelobjekte und Badge-Boni stehen in `BalanceParams`.
 */
export const COLLECTION_SETS: readonly CollectionSet[] = Object.freeze([
  {
    id: 'mat-relics',
    items: ['stromatolite', 'biofilm-disc', 'green-pearl'],
    sites: ['algal-mat', 'bacterial-mat'],
    badge: { target: 'collectRate', op: 'add' },
  },
  {
    id: 'deep-stones',
    items: ['pyrite', 'basalt-pebble', 'magnetite'],
    sites: ['vent', 'methane-seep'],
    badge: { target: 'broodRate', op: 'add' },
  },
  {
    id: 'whale-relics',
    items: ['bone-splinter', 'fat-pearl', 'tooth-scale'],
    sites: ['whale-fall'],
    badge: { target: 'combatLoss', op: 'mul' },
  },
  {
    id: 'drift',
    items: ['pumice', 'foam-ball', 'clay-bead'],
    sites: ALL_SITES,
    badge: { target: 'findChance', op: 'add' },
  },
]);

export const COLLECTION_SET_BY_ID: Readonly<Record<CollectionSetId, CollectionSet>> = Object.freeze(
  Object.fromEntries(COLLECTION_SETS.map((set) => [set.id, set])) as Record<
    CollectionSetId,
    CollectionSet
  >,
);

/**
 * Einträge der Fundtabelle Ära I in Ziehungsreihenfolge (`FIND_ENTRY_IDS`, Game-Design §4.16). Die
 * Fundorte der Sammelobjekte sind die ihres Sets.
 */
export const FIND_ENTRIES: readonly FindEntry[] = Object.freeze([
  { kind: 'dna', id: FOREIGN_DNA, sites: ALL_SITES },
  { kind: 'food', id: NUTRIENT_BUBBLE, sites: ALL_SITES },
  {
    kind: 'buff',
    id: 'plankton-bloom',
    sites: ALL_SITES,
    effect: { target: 'collectRate', op: 'mul' },
  },
  {
    kind: 'buff',
    id: 'warm-current',
    sites: ALL_SITES,
    effect: { target: 'broodRate', op: 'mul' },
  },
  { kind: 'fragment', id: 'thermophile', sites: ['vent'] },
  { kind: 'fragment', id: 'sulfur-pearl', sites: ['vent', 'methane-seep'] },
  { kind: 'fragment', id: 'chloroplast', sites: ['algal-mat'] },
  {
    kind: 'fragment',
    id: 'primal-crystal',
    sites: ['bacterial-mat', 'methane-seep', 'whale-fall'],
  },
  ...COLLECTION_SETS.flatMap((set) =>
    set.items.map((id: CollectibleId): FindEntry => ({
      kind: 'collectible',
      id,
      set: set.id,
      sites: set.sites,
    })),
  ),
]);

export const FIND_ENTRY_BY_ID: Readonly<Record<FindEntryId, FindEntry>> = Object.freeze(
  Object.fromEntries(FIND_ENTRIES.map((entry) => [entry.id, entry])) as Record<
    FindEntryId,
    FindEntry
  >,
);

/** Einträge je Futterstellentyp in Ziehungsreihenfolge (Game-Design §4.16). */
export const FIND_ENTRIES_BY_SITE: Readonly<Record<SiteTypeId, readonly FindEntry[]>> =
  Object.freeze(
    Object.fromEntries(
      SITE_TYPE_IDS.map((type) => [
        type,
        Object.freeze(FIND_ENTRIES.filter((entry) => entry.sites.includes(type))),
      ]),
    ) as Record<SiteTypeId, readonly FindEntry[]>,
  );

/** Einzigartige Adaption je Fragment, abgeleitet aus den Genom-Daten (Game-Design §4.14). */
export const FRAGMENT_ADAPTATIONS: FragmentAdaptations = Object.freeze(
  Object.fromEntries(
    UNIQUE_ADAPTATIONS.map((adaptation) => [adaptation.fragment, adaptation.id]),
  ) as Record<keyof FragmentAdaptations, FragmentAdaptations[keyof FragmentAdaptations]>,
);
