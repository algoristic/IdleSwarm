import type { FoundEvent } from '@app/finds/domain/models/finds-event.model';
import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { Units } from '@app/swarm/domain/models/units.model';

import type { GameEvent } from './game-event.model';
import type { GameState } from './game-state.model';

/** Anlass des Nachholens: Laden eines Spielstands oder Rückstand eines verborgenen Tabs. */
export const CATCH_UP_SOURCES = ['load', 'background'] as const;
export type CatchUpSource = (typeof CATCH_UP_SOURCES)[number];

/** Nahrung des Nachholens; offline gibt es keine Käufe, nur die Brut verbraucht Nahrung. */
export interface CatchUpFood {
  /** Zufluss: Sammeln, Funde und Autophagie, also `net + spentOnBrood`. */
  readonly gained: Num;
  /** Brutkosten `c_d · ΔD_Brut + c_s · ΔS_Brut` (Game-Design §4.3, ohne Preisfaktor). */
  readonly spentOnBrood: Num;
  /** Änderung des Vorrats nachher minus vorher; kann negativ sein. */
  readonly net: Num;
}

/**
 * Zusammenfassung eines Nachholens (US-07.01, US-07.03): nur Rohwerte, IDs und Codes, die Texte
 * setzt die Oberfläche. Mehrere noch nicht quittierte Zusammenfassungen fasst
 * `mergeCatchUpSummaries` zusammen.
 */
export interface CatchUpSummary {
  readonly source: CatchUpSource;
  /** Abwesenheit, die nachgeholt werden sollte; negative Angaben (Uhr zurückgestellt) zählen als 0. */
  readonly requestedMs: number;
  /** Tatsächlich nachgeholte Spielzeit, höchstens `T_max`. */
  readonly caughtUpMs: number;
  /** Über `T_max` hinaus verworfene Zeit; `0`, wenn nicht gedeckelt. */
  readonly discardedMs: number;
  readonly capped: boolean;
  readonly food: CatchUpFood;
  /** Gewonnene DNA aus Kämpfen und Funden; offline wird keine ausgegeben. */
  readonly dna: Num;
  /** Geschlüpfte Einheiten je Typ (Königinnen schlüpfen nicht, also 0). */
  readonly hatched: Units;
  /** Verlorene Einheiten je Typ: gefallene Soldaten und beim Aufbruch Zurückgelassene. */
  readonly lost: Units;
  /** Typen der erreichten Futterstellen in Reihenfolge der Ankunft. */
  readonly arrivals: readonly SiteTypeId[];
  /** Anzahl der Aufbrüche (offline nur durch das Auto-Weiterziehen). */
  readonly departures: number;
  /** Funde in zeitlicher Reihenfolge. */
  readonly finds: readonly FoundEvent[];
}

/** Ergebnis von `catchUp`: Endzustand, alle Ereignisse in zeitlicher Reihenfolge, Zusammenfassung. */
export interface CatchUpResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
  readonly summary: CatchUpSummary;
}
