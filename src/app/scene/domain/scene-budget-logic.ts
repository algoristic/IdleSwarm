import { Num } from '@app/shared/util/num/num';
import { UNIT_TYPES, type UnitType, type Units } from '@app/swarm/domain/models/units.model';

import type { UnitCounts } from './models/scene.model';

/** Höchstzahl gezeichneter Agenten (TK §8.2, ADR-006); mobil die Hälfte. */
export const SPRITE_BUDGET = 300;
export const SPRITE_BUDGET_MOBILE = 150;
/** Schmaler als das gilt der Viewport als mobil (Tailwind-Breakpoint `md`). */
export const MOBILE_MAX_WIDTH = 768;

/**
 * Budget nach Gerät: schmaler Viewport oder grober Zeiger (Touch) gelten als mobil. Der Zeiger
 * erfasst Tablets, deren Breite über `MOBILE_MAX_WIDTH` liegt, deren GPU aber eher der eines
 * Smartphones entspricht.
 */
export function spriteBudget(viewportWidth: number, coarsePointer: boolean): number {
  return coarsePointer || viewportWidth < MOBILE_MAX_WIDTH ? SPRITE_BUDGET_MOBILE : SPRITE_BUDGET;
}

/** Ganze Einheiten je Typ als Zahl; riesige Bestände werden gekappt, das Budget teilt ohnehin. */
export function unitCounts(units: Units): UnitCounts {
  const count = (value: Num): number =>
    Math.max(0, value.min(Number.MAX_SAFE_INTEGER).floor().toNumber());
  return {
    queens: count(units.queens),
    drones: count(units.drones),
    soldiers: count(units.soldiers),
  };
}

/**
 * Sprites je Typ: bis zum Budget ein Sprite je Einheit, darüber steht ein Sprite für mehrere
 * Einheiten. Die Aufteilung folgt dem Bestand (größte Reste); jeder vorhandene Typ bekommt
 * mindestens ein Sprite, die Summe ist genau das Budget.
 */
export function spriteCounts(counts: UnitCounts, budget: number): UnitCounts {
  const total = UNIT_TYPES.reduce((sum, type) => sum + counts[type], 0);
  if (total <= budget) {
    return counts;
  }
  const quota = (type: UnitType): number => (counts[type] / total) * budget;
  const result = { queens: 0, drones: 0, soldiers: 0 };
  for (const type of UNIT_TYPES) {
    result[type] = counts[type] > 0 ? Math.max(1, Math.floor(quota(type))) : 0;
  }
  let assigned = UNIT_TYPES.reduce((sum, type) => sum + result[type], 0);
  // Mindestens ein Sprite je Typ kann das Budget überziehen: dann beim größten Typ abziehen.
  while (assigned > budget) {
    const largest = [...UNIT_TYPES].sort((a, b) => result[b] - result[a])[0];
    result[largest]--;
    assigned--;
  }
  // Rest nach größtem Nachkommaanteil; bei Gleichstand gilt die Reihenfolge von `UNIT_TYPES`.
  const byRemainder = UNIT_TYPES.filter((type) => counts[type] > 0).sort(
    (a, b) => quota(b) - Math.floor(quota(b)) - (quota(a) - Math.floor(quota(a))),
  );
  for (let i = 0; assigned < budget && byRemainder.length > 0; i++) {
    result[byRemainder[i % byRemainder.length]]++;
    assigned++;
  }
  return result;
}
