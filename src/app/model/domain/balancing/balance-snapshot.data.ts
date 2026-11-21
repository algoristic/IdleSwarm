import type { BalanceSnapshot } from './models/balance-snapshot.model';

/**
 * Eingefrorene Kennzahlen fester Bot-Läufe mit den Werten v1.5 (Game-Design §6.6, Messung M1.5):
 * 24 h, Schritt 1 s, Abtastung 60 s, Standardwerte. Zeiten in ms.
 *
 * Nicht automatisch erzeugen oder überschreiben: Eine gewollte Änderung an Werten, Formeln, Bots oder
 * Mess-Definitionen trägt die neuen Werte hier bewusst ein und begründet sie in Game-Design §6.
 * Schlägt der Snapshot ohne gewollte Änderung fehl, ist das Pacing verrutscht.
 */
export const BALANCE_SNAPSHOTS: readonly BalanceSnapshot[] = [
  {
    seed: 'modell',
    bot: 'active',
    metrics: {
      firstBuyMs: 0,
      longestWaitMs: 25_000,
      buyGapMedianMs: 5_000,
      sitesCompleted: 113,
      firstSiteMs: 939_749,
      siteMedianMs: 667_932,
      siteShareInBand: 0.814,
      moves: 113,
      combatCaptures: 30,
      dnaTotal: 2_377_638.8,
      genomeCompleteMs: 44_043_000,
      unlockGapMs: 1_544_000,
      longestNoBuyFirstHourMs: 412_000,
      longestNoBuyMs: 1_309_000,
    },
  },
  {
    seed: 'modell',
    bot: 'idle',
    metrics: {
      firstBuyMs: 0,
      longestWaitMs: 2_000,
      buyGapMedianMs: 300_000,
      sitesCompleted: 112,
      firstSiteMs: 1_236_742,
      siteMedianMs: 665_258,
      siteShareInBand: 0.652,
      moves: 112,
      combatCaptures: 30,
      dnaTotal: 1_623_393.6,
      genomeCompleteMs: 45_600_000,
      unlockGapMs: 1_200_000,
      longestNoBuyFirstHourMs: 300_000,
      longestNoBuyMs: 1_200_000,
    },
  },
  {
    seed: 'release',
    bot: 'active',
    metrics: {
      firstBuyMs: 0,
      longestWaitMs: 43_772,
      buyGapMedianMs: 6_000,
      sitesCompleted: 111,
      firstSiteMs: 960_212,
      siteMedianMs: 737_209,
      siteShareInBand: 0.829,
      moves: 111,
      combatCaptures: 30,
      dnaTotal: 703_380.5,
      genomeCompleteMs: 45_385_000,
      unlockGapMs: 1_352_000,
      longestNoBuyFirstHourMs: 403_000,
      longestNoBuyMs: 1_347_000,
    },
  },
  {
    seed: 'release',
    bot: 'idle',
    metrics: {
      firstBuyMs: 0,
      longestWaitMs: 2_000,
      buyGapMedianMs: 300_000,
      sitesCompleted: 109,
      firstSiteMs: 1_268_688,
      siteMedianMs: 741_343,
      siteShareInBand: 0.789,
      moves: 109,
      combatCaptures: 29,
      dnaTotal: 703_330.2,
      genomeCompleteMs: 47_100_000,
      unlockGapMs: 1_200_000,
      longestNoBuyFirstHourMs: 300_000,
      longestNoBuyMs: 1_200_000,
    },
  },
];
