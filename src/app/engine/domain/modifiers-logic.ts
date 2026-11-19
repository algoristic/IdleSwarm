import type { BalanceParams } from '@app/balance/domain/constants';
import { combineEffects } from '@app/balance/domain/effects-logic';
import type { Effect, Modifiers } from '@app/balance/domain/models/effect.model';
import { badgeEffects } from '@app/finds/domain/collection-logic';
import { buffEffects, isBuffActive } from '@app/finds/domain/finds-logic';
import type { FindBuff } from '@app/finds/domain/models/finds.model';
import type { EffectPreview } from '@app/genome/domain/genome-logic';
import {
  genomeEffects,
  nodeEffectPreview,
  uniqueAdaptationEffectPreview,
} from '@app/genome/domain/genome-logic';
import type { GenomeNodeId, UniqueAdaptationId } from '@app/genome/domain/models/genome.model';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type { GameState } from './models/game-state.model';

/**
 * Effekte aller Quellen des Zustands (Game-Design §4.13): entwickelte Adaptionen, einzigartige
 * Adaptionen, Badges und laufende Buffs. Der Spielstand speichert nur die Quellen; jede Quelle trägt
 * ihre Effekte hier bei.
 */
export function stateEffects(state: GameState, params: BalanceParams): readonly Effect[] {
  const { finds, genome, time } = state;
  const genomeSources = genomeEffects(genome, finds, params);
  const badges = badgeEffects(finds, params);
  // Buffs wirken nur, solange `expiresAtMs > time.played` (Game-Design §4.16).
  const buffs = buffEffects(finds, time.played, params);
  if (badges.length === 0 && buffs.length === 0) {
    return genomeSources;
  }
  return [...genomeSources, ...badges, ...buffs];
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
  const { genome, finds, time } = state;
  const siteType = effectSiteType(state);
  const activeBuffs = finds.buffs.filter((buff) => isBuffActive(buff, time.played));
  const last = lastModifiers;
  if (
    last !== null &&
    last.genome === genome &&
    last.collected === finds.collected &&
    last.params === params &&
    last.siteType === siteType &&
    sameItems(last.activeBuffs, activeBuffs)
  ) {
    return last.modifiers;
  }
  const modifiers = combineEffects(stateEffects(state, params), siteType);
  lastModifiers = { genome, collected: finds.collected, params, siteType, activeBuffs, modifiers };
  return modifiers;
}

/**
 * Letzte Rechnung von {@link stateModifiers}. Die Modifikatoren hängen nur von Genom, gefundenen
 * Fragmenten und Sammelobjekten, laufenden Buffs, `params` und dem Futterstellentyp ab; Schritt,
 * Runner und Bots fragen sie je Zustand mehrfach ab, meist ohne dass sich eine Quelle ändert. Der
 * Zwischenspeicher vergleicht nur Referenzen und ändert kein Ergebnis.
 */
let lastModifiers: {
  readonly genome: GameState['genome'];
  readonly collected: GameState['finds']['collected'];
  readonly params: BalanceParams;
  readonly siteType: SiteTypeId | null;
  readonly activeBuffs: readonly FindBuff[];
  readonly modifiers: Modifiers;
} | null = null;

function sameItems<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * „Effekt vorher → nachher“ eines regulären Knotens mit allen übrigen Quellen des Zustands
 * (Game-Design §4.14, US-05.02); für die Viewmodels der Genom-Ansicht.
 */
export function genomeNodePreview(
  state: GameState,
  id: GenomeNodeId,
  params: BalanceParams,
): readonly EffectPreview[] {
  return nodeEffectPreview(state, id, params, (current) => stateModifiers(current, params));
}

/**
 * „Effekt vorher → nachher“ einer einzigartigen Adaption mit allen übrigen Quellen des Zustands
 * (Game-Design §4.14); für die Upgrade-Tabelle der Modell-Seite (US-10.07).
 */
export function uniqueAdaptationPreview(
  state: GameState,
  id: UniqueAdaptationId,
  params: BalanceParams,
): readonly EffectPreview[] {
  return uniqueAdaptationEffectPreview(state, id, params, (current) =>
    stateModifiers(current, params),
  );
}
