import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

/** Aktueller Standort für Titel und Notiz der Umgebung. */
export interface CurrentSiteView {
  readonly type: SiteTypeId;
  readonly stock: Num;
  readonly size: Num;
  /** Füllstand von 0 bis 100. */
  readonly stockPercent: number;
  /** `null`, wenn der Vorrat leer ist oder nichts abgebaut wird. */
  readonly secondsLeft: Num | null;
}

/** Laufende Reise. */
export interface TravelView {
  readonly type: SiteTypeId;
  readonly secondsLeft: Num;
}
