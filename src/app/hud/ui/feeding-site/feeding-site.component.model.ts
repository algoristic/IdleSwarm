import type { Num } from '@app/shared/util/num/num';

export interface SiteView {
  /** Gesamtrate aus Grundertrag und Drohnen (US-01.02). */
  readonly rate: Num;
  readonly stock: Num;
  readonly size: Num;
  /** Füllstand des Balkens von 0 bis 100. */
  readonly stockPercent: number;
  /** `null`, wenn nichts abgebaut wird. */
  readonly secondsLeft: Num | null;
  readonly empty: boolean;
}
