import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

/** Laufende Reise zur nächsten Futterstelle (Game-Design §4.11). */
export interface TravelView {
  readonly target: SiteTypeId;
  /** Restdauer in Sekunden. */
  readonly secondsLeft: Num;
}

export interface SiteView {
  readonly type: SiteTypeId;
  /** Gesamtrate aus Grundertrag und Drohnen (US-01.02). */
  readonly rate: Num;
  readonly stock: Num;
  readonly size: Num;
  /** Füllstand des Balkens von 0 bis 100. */
  readonly stockPercent: number;
  /** `null`, wenn nichts abgebaut wird. */
  readonly secondsLeft: Num | null;
  readonly empty: boolean;
  /** `null`, solange der Schwarm nicht unterwegs ist. */
  readonly travel: TravelView | null;
}
