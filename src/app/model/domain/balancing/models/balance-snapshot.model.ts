import type { PacingBot } from '@app/balance/domain/targets';

/** Fester Lauf eines Balancing-Snapshots (technisches Konzept §5.6, US-10.09). */
export interface BalanceSnapshotRun {
  readonly seed: string;
  readonly bot: PacingBot;
}

/** Wesentliche Kennzahlen eines festen Bot-Laufs; Zeiten in ms, `null` = nie eingetreten. */
export interface BalanceSnapshotMetrics {
  readonly firstBuyMs: number | null;
  /** Längste Wartezeit der ersten 30 min. */
  readonly longestWaitMs: number;
  /** Median der Kauflücken der ersten 30 min. */
  readonly buyGapMedianMs: number | null;
  /** Abgeschlossene Futterstellen (mit Aufbruch). */
  readonly sitesCompleted: number;
  readonly firstSiteMs: number | null;
  readonly siteMedianMs: number | null;
  /** Anteil der abgeschlossenen Futterstellen im Zielband des Bots (0–1). */
  readonly siteShareInBand: number;
  readonly moves: number;
  /** Einnahmen mit Kampf (Abwehr > 0). */
  readonly combatCaptures: number;
  /** DNA aus Kampf und Funden. */
  readonly dnaTotal: number;
  readonly genomeCompleteMs: number | null;
  /** Größter Abstand neuer Optionen in der ersten Stunde. */
  readonly unlockGapMs: number;
  /** Längste Strecke ohne Kauf in der ersten Stunde. */
  readonly longestNoBuyFirstHourMs: number;
  /** Längste Strecke ohne Kauf über den ganzen Lauf. */
  readonly longestNoBuyMs: number;
}

export type BalanceSnapshotKey = keyof BalanceSnapshotMetrics;

/** Eingefrorene Kennzahlen eines Laufs. */
export interface BalanceSnapshot extends BalanceSnapshotRun {
  readonly metrics: BalanceSnapshotMetrics;
}

/** Abweichung einer Kennzahl über die Toleranz hinaus. */
export interface BalanceSnapshotDeviation {
  readonly key: BalanceSnapshotKey;
  readonly expected: number | null;
  readonly actual: number | null;
  /** Erlaubter Abstand; `null`, wenn einer der Werte fehlt. */
  readonly allowed: number | null;
}
