import type { BalanceParams } from '@app/balance/domain/constants';
import { BADGE_PARAMS } from '@app/balance/domain/formulas';
import type { Effect, ValueEffect } from '@app/balance/domain/models/effect.model';
import { UNIQUE_ADAPTATIONS } from '@app/genome/domain/data/genome-era1.data';
import { fragmentProgress } from '@app/genome/domain/genome-logic';

import { COLLECTION_SET_BY_ID, COLLECTION_SETS } from './data/finds-era1.data';
import type {
  CollectionProgress,
  DrawerFragments,
  DrawerSet,
  FindsDrawer,
} from './models/collection.model';
import type { CollectibleId, CollectionSetId, Finds } from './models/finds.model';

const NO_EFFECTS: readonly Effect[] = Object.freeze([]);

/** Jedes Sammelobjekt gibt es einmal (Game-Design §4.17). */
export function isCollectibleCollected(finds: Finds, id: CollectibleId): boolean {
  return (finds.collected[id] ?? 0) >= 1;
}

/** Gesammelte Objekte eines Sets, x / 3 (Game-Design §4.17). */
export function setProgress(finds: Finds, id: CollectionSetId): CollectionProgress {
  const { items } = COLLECTION_SET_BY_ID[id];
  return {
    found: items.filter((item) => isCollectibleCollected(finds, item)).length,
    total: items.length,
  };
}

/** Ist das Set vollständig, wirkt sein Badge; abgeleitet, nicht gespeichert (Game-Design §4.17). */
export function isSetComplete(finds: Finds, id: CollectionSetId): boolean {
  return COLLECTION_SET_BY_ID[id].items.every((item) => isCollectibleCollected(finds, item));
}

/** Erhaltene Badges in der Reihenfolge der Sets; die Badge-ID ist die Set-ID. */
export function earnedBadges(finds: Finds): readonly CollectionSetId[] {
  return COLLECTION_SETS.filter((set) => isSetComplete(finds, set.id)).map((set) => set.id);
}

/** Bonus des Badges eines Sets mit `<setId>BadgeEffect` aus `params`, ob erhalten oder nicht (§4.17). */
export function badgeEffect(id: CollectionSetId, params: BalanceParams): ValueEffect {
  return { ...COLLECTION_SET_BY_ID[id].badge, value: params[BADGE_PARAMS[id].effect] };
}

/** Effekte der erhaltenen Badges mit `<setId>BadgeEffect` aus `params` (Game-Design §4.13, §4.17). */
export function badgeEffects(finds: Finds, params: BalanceParams): readonly Effect[] {
  const effects = earnedBadges(finds).map((id): Effect => badgeEffect(id, params));
  return effects.length === 0 ? NO_EFFECTS : effects;
}

/**
 * Fortschritt der Sammlung (Game-Design §4.17): `y = Sammelobjekte + Σ <id>Fragments`,
 * `x = gesammelte Sammelobjekte + Σ min(Fragmentzähler, benötigt)`; v1 y = 24.
 */
export function collectionProgress(finds: Finds, params: BalanceParams): CollectionProgress {
  let found = 0;
  let total = 0;
  for (const set of COLLECTION_SETS) {
    const progress = setProgress(finds, set.id);
    found += progress.found;
    total += progress.total;
  }
  for (const { id } of UNIQUE_ADAPTATIONS) {
    const progress = fragmentProgress(finds, id, params);
    found += progress.found;
    total += progress.required;
  }
  return { found, total };
}

/**
 * Schublade „Funde“ (US-06.04): je Set die Sammelobjekte als bekannt/unbekannt mit x / 3 und
 * Badge, je einzigartiger Adaption ein Feld je benötigtem Fragment mit x / benötigt, dazu x / y
 * gesamt. Reine Ableitung aus dem Fundzustand.
 */
export function findsDrawer(finds: Finds, params: BalanceParams): FindsDrawer {
  const sets = COLLECTION_SETS.map((set): DrawerSet => ({
    id: set.id,
    progress: setProgress(finds, set.id),
    badge: isSetComplete(finds, set.id),
    fields: set.items.map((id) => ({ id, known: isCollectibleCollected(finds, id) })),
  }));
  const fragments = UNIQUE_ADAPTATIONS.map((adaptation): DrawerFragments => {
    const { found, required } = fragmentProgress(finds, adaptation.id, params);
    // `required` ist ein Balance-Wert; ein ungültiger Wert ergibt keine Felder statt eines Fehlers.
    const slots = Number.isInteger(required) && required > 0 ? required : 0;
    return {
      adaptation: adaptation.id,
      fragment: adaptation.fragment,
      progress: { found, total: required },
      unlocked: found >= required,
      fields: Array.from({ length: slots }, (_, index) => ({
        id: adaptation.fragment,
        known: index < found,
      })),
    };
  });
  return { progress: collectionProgress(finds, params), sets, fragments };
}
