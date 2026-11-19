import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

import type { SiteTypeId } from '../data/sites-era1.data';

/**
 * Aufbruch zu einem Ziel (Game-Design §4.11). `playedMs` ist die Spielzeit (`time.played`) des
 * Aufbruchs.
 */
export interface DepartedEvent {
  readonly type: 'departed';
  readonly playedMs: number;
  /** Typ des Ziels. */
  readonly siteType: SiteTypeId;
  readonly distance: number;
  /** Zurückgelassene Einheiten `D − D'`, `S − S'` (Game-Design §4.9). */
  readonly leftBehind: { readonly drones: Num; readonly soldiers: Num };
  /** Restvorrat, der beim Aufbruch verfallen ist. */
  readonly forfeitedStock: Num;
  /** `true`, wenn das Auto-Weiterziehen aufgebrochen ist (Game-Design §4.12). */
  readonly auto: boolean;
}

/** Ankunft an einem Ziel; `playedMs` ist der exakte Ankunftszeitpunkt in Spielzeit. */
export interface ArrivedEvent {
  readonly type: 'arrived';
  readonly playedMs: number;
  /** Typ der neuen Futterstelle. */
  readonly siteType: SiteTypeId;
  /** Gefallene Soldaten `L`. */
  readonly losses: Num;
  /** Gutgeschriebene DNA. */
  readonly dna: Num;
}

/**
 * Der Vorrat ist durch Sammeln auf 0 gefallen; `playedMs` ist der Zeitpunkt innerhalb des Schritts,
 * an dem er leer wurde.
 */
export interface SiteDepletedEvent {
  readonly type: 'siteDepleted';
  readonly playedMs: number;
  readonly siteType: SiteTypeId;
}

export type SiteEvent = DepartedEvent | ArrivedEvent | SiteDepletedEvent;

/** Zustand und Ereignisse eines Teils von Kommando oder Schritt. */
export interface SiteResult {
  readonly state: GameState;
  readonly events: readonly SiteEvent[];
}
