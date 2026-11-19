import type { CollectionSetId, FindEntryId } from '../../domain/models/finds.model';

/**
 * Namen der Einträge der Fundtabelle für Log und Schublade „Funde“ (Game-Design §4.16, §4.17):
 * Fremde DNA, Nährstoffblase, Buffs, Fragmente und Sammelobjekte.
 */
export const FIND_ENTRY_LABELS: Readonly<Record<FindEntryId, string>> = {
  'foreign-dna': $localize`:@@uiFinds-findsLabels-entry-foreignDna:Fremde DNA`,
  'nutrient-bubble': $localize`:@@uiFinds-findsLabels-entry-nutrientBubble:Nährstoffblase`,
  'plankton-bloom': $localize`:@@uiFinds-findsLabels-entry-planktonBloom:Planktonblüte`,
  'warm-current': $localize`:@@uiFinds-findsLabels-entry-warmCurrent:Warme Strömung`,
  thermophile: $localize`:@@uiFinds-findsLabels-entry-thermophile:Thermophile Mikrobe`,
  'sulfur-pearl': $localize`:@@uiFinds-findsLabels-entry-sulfurPearl:Schwefelperle`,
  chloroplast: $localize`:@@uiFinds-findsLabels-entry-chloroplast:Chloroplast`,
  'primal-crystal': $localize`:@@uiFinds-findsLabels-entry-primalCrystal:Urzeitkristall`,
  stromatolite: $localize`:@@uiFinds-findsLabels-entry-stromatolite:Stromatolith`,
  'biofilm-disc': $localize`:@@uiFinds-findsLabels-entry-biofilmDisc:Biofilmscheibe`,
  'green-pearl': $localize`:@@uiFinds-findsLabels-entry-greenPearl:Grünperle`,
  pyrite: $localize`:@@uiFinds-findsLabels-entry-pyrite:Pyrit`,
  'basalt-pebble': $localize`:@@uiFinds-findsLabels-entry-basaltPebble:Basaltkiesel`,
  magnetite: $localize`:@@uiFinds-findsLabels-entry-magnetite:Magnetit`,
  'bone-splinter': $localize`:@@uiFinds-findsLabels-entry-boneSplinter:Knochensplitter`,
  'fat-pearl': $localize`:@@uiFinds-findsLabels-entry-fatPearl:Fettperle`,
  'tooth-scale': $localize`:@@uiFinds-findsLabels-entry-toothScale:Zahnschuppe`,
  pumice: $localize`:@@uiFinds-findsLabels-entry-pumice:Bimsstein`,
  'foam-ball': $localize`:@@uiFinds-findsLabels-entry-foamBall:Schaumkugel`,
  'clay-bead': $localize`:@@uiFinds-findsLabels-entry-clayBead:Tonperle`,
};

/** Namen der Sets der Sammlung (Game-Design §4.17). */
export const COLLECTION_SET_LABELS: Readonly<Record<CollectionSetId, string>> = {
  'mat-relics': $localize`:@@uiFinds-findsLabels-set-matRelics:Mattenschätze`,
  'deep-stones': $localize`:@@uiFinds-findsLabels-set-deepStones:Tiefengestein`,
  'whale-relics': $localize`:@@uiFinds-findsLabels-set-whaleRelics:Walsturz-Relikte`,
  drift: $localize`:@@uiFinds-findsLabels-set-drift:Treibgut`,
};

/** Namen der Badges je Set; die Badge-ID ist die Set-ID (Game-Design §4.17). */
export const BADGE_LABELS: Readonly<Record<CollectionSetId, string>> = {
  'mat-relics': $localize`:@@uiFinds-findsLabels-badge-matRelics:Mattenkenner`,
  'deep-stones': $localize`:@@uiFinds-findsLabels-badge-deepStones:Steinkundler`,
  'whale-relics': $localize`:@@uiFinds-findsLabels-badge-whaleRelics:Aasfresser`,
  drift: $localize`:@@uiFinds-findsLabels-badge-drift:Treibgutsammler`,
};
