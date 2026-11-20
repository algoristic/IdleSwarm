import type { FindEntryId } from '@app/finds/domain/models/finds.model';
import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { UnitType } from '@app/swarm/domain/models/units.model';

export interface ReturnSummaryUnitView {
  readonly unit: UnitType;
  readonly count: Num;
}

/** Gleiche Typen zusammengefasst, in der Reihenfolge der ersten Ankunft. */
export interface ReturnSummarySiteView {
  readonly siteType: SiteTypeId;
  readonly count: number;
}

/** Gleiche wirksame Einträge zusammengefasst, in der Reihenfolge des ersten Funds. */
export interface ReturnSummaryFindView {
  readonly entry: FindEntryId;
  readonly count: number;
}

/** Rückkehr-Zusammenfassung (US-07.03): Rohwerte und IDs, Texte setzt der Dialog. */
export interface ReturnSummaryView {
  /** Nachgeholte Spielzeit in Sekunden, höchstens `T_max`. */
  readonly caughtUpSeconds: Num;
  readonly capped: boolean;
  /** Über `T_max` hinaus verfallene Zeit in Sekunden. */
  readonly discardedSeconds: Num;
  /** Zufluss an Nahrung (Sammeln, Funde, Autophagie), ohne die Brutkosten abzuziehen. */
  readonly foodGained: Num;
  readonly dna: Num;
  /** Nur Typen, deren abgerundete Anzeige größer als 0 ist, in der Reihenfolge der Aktionsleiste. */
  readonly hatched: readonly ReturnSummaryUnitView[];
  /** Nur Typen mit Verlusten über 0 (aufgerundet angezeigt). */
  readonly lost: readonly ReturnSummaryUnitView[];
  readonly departures: number;
  readonly arrivals: readonly ReturnSummarySiteView[];
  readonly findCount: number;
  readonly finds: readonly ReturnSummaryFindView[];
}
