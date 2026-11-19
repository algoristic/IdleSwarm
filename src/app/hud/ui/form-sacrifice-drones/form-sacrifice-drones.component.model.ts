import type { Num } from '@app/shared/util/num/num';

/** Was das Opfern-Formular aus dem Spielkern braucht (Game-Design §4.10). */
export interface SacrificeView {
  /** Ganze vorhandene Drohnen; mehr lassen sich nicht wählen. */
  readonly maxCount: number;
  /** Nahrung je geopferter Drohne `η · c_d`; der Ertrag wächst linear mit der Anzahl. */
  readonly foodPerDrone: Num;
  /** Umwandlungsverlust `1 − η` in Prozent. */
  readonly lossPercent: number;
}

/** Formularwerte; die Anzahl bleibt Text, damit die deutsche Schreibweise erhalten bleibt. */
export interface SacrificeDronesValue {
  readonly count: string;
}
