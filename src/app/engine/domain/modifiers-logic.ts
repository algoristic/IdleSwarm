import type { BalanceParams } from '@app/balance/domain/constants';
import { combineEffects } from '@app/balance/domain/effects-logic';
import type { Effect, Modifiers } from '@app/balance/domain/models/effect.model';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type { GameState } from './models/game-state.model';

/**
 * Effekte aller Quellen des Zustands (Game-Design §4.13): entwickelte Adaptionen, einzigartige
 * Adaptionen, Badges und laufende Buffs. Der Spielstand speichert nur die Quellen; jede Quelle trägt
 * ihre Effekte hier bei. Bis zu den Quellen (M1.3) gibt es keine.
 */
export function stateEffects(_state: GameState, _params: BalanceParams): readonly Effect[] {
  return [];
}

/** Typ, gegen den Bedingungen `when: { siteType }` geprüft werden; während einer Reise `null`. */
export function effectSiteType(state: GameState): SiteTypeId | null {
  return state.travel === null ? state.site.type : null;
}

/**
 * Modifikatoren des Zustands: Effekte aller Quellen, verrechnet gegen den aktuellen
 * Futterstellentyp. Einziger Weg zu den Modifikatoren für Schritt, Kommandos und Anzeigen, damit
 * neue Quellen überall sofort wirken (US-05.03).
 */
export function stateModifiers(state: GameState, params: BalanceParams): Modifiers {
  return combineEffects(stateEffects(state, params), effectSiteType(state));
}
