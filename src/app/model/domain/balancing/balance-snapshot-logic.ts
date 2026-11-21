import { isWithinBand, pacingTargetsFor } from '@app/balance/domain/targets';
import {
  PURCHASE_EVENT_TYPES,
  runSimulation,
  SimEvent,
  SimResult,
} from '@app/engine/domain/runner-logic';
import { MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';

import { createActiveBot } from '../bots/active-bot-logic';
import { createIdleBot } from '../bots/idle-bot-logic';
import { longestUnlockGap, progressMetrics, PROGRESS_CHECKPOINT_MS } from '../progress-logic';
import type {
  BalanceSnapshotDeviation,
  BalanceSnapshotKey,
  BalanceSnapshotMetrics,
  BalanceSnapshotRun,
} from './models/balance-snapshot.model';

/** Messaufbau wie Game-Design §6.5/§6.6: 24 h, Schritt 1 s, Abtastung 60 s. */
export const SNAPSHOT_DURATION_MS = 24 * MS_PER_HOUR;
export const SNAPSHOT_STEP_MS = MS_PER_SECOND;
export const SNAPSHOT_SAMPLE_EVERY_MS = MS_PER_MINUTE;

/** Relative Toleranz je Kennzahl (±5 %). */
export const SNAPSHOT_RELATIVE_TOLERANCE = 0.05;

/**
 * Absoluter Mindestabstand je Kennzahl, damit kleine Werte und Zählwerte nicht an Rundung oder
 * einem einzelnen Entscheidungstakt scheitern: Zeiten 2 s (zwei Schritte bzw. Entscheidungen von
 * „Aktiv“), Zählwerte 1, Anteile 0,02, DNA 1.
 */
const TIME_MIN_ALLOWED_MS = 2 * MS_PER_SECOND;
export const SNAPSHOT_MIN_ALLOWED: Readonly<Record<BalanceSnapshotKey, number>> = {
  firstBuyMs: TIME_MIN_ALLOWED_MS,
  longestWaitMs: TIME_MIN_ALLOWED_MS,
  buyGapMedianMs: TIME_MIN_ALLOWED_MS,
  sitesCompleted: 1,
  firstSiteMs: TIME_MIN_ALLOWED_MS,
  siteMedianMs: TIME_MIN_ALLOWED_MS,
  siteShareInBand: 0.02,
  moves: 1,
  combatCaptures: 1,
  dnaTotal: 1,
  genomeCompleteMs: TIME_MIN_ALLOWED_MS,
  unlockGapMs: TIME_MIN_ALLOWED_MS,
  longestNoBuyFirstHourMs: TIME_MIN_ALLOWED_MS,
  longestNoBuyMs: TIME_MIN_ALLOWED_MS,
};

function median(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Längste Strecke ohne Kauf in `[0; endMs]`, einschließlich Laufbeginn und Fensterende. */
export function longestNoBuyUntil(events: readonly SimEvent[], endMs: number): number {
  const purchases: readonly SimEvent['type'][] = PURCHASE_EVENT_TYPES;
  const times = events
    .filter((event) => purchases.includes(event.type) && event.timeMs <= endMs)
    .map((event) => event.timeMs);
  const bounds = [0, ...times, endMs];
  let longest = 0;
  for (let i = 1; i < bounds.length; i++) {
    longest = Math.max(longest, bounds[i] - bounds[i - 1]);
  }
  return longest;
}

/** Kennzahlen eines Laufs für den Snapshot; das Zielband der Futterstellen kommt aus `targets`. */
export function snapshotMetrics(
  result: SimResult,
  bot: BalanceSnapshotRun['bot'],
): BalanceSnapshotMetrics {
  const { metrics, events, durationMs } = result;
  const progress = progressMetrics(events, metrics.sites);
  const durations = metrics.sites.flatMap((site) =>
    site.durationMs === null ? [] : [site.durationMs],
  );
  const band = pacingTargetsFor(bot).find((target) => target.id === 'siteDuration')?.band;
  const inBand =
    band === undefined ? 0 : durations.filter((value) => isWithinBand(value, band)).length;
  const unlockGap = longestUnlockGap(progress.unlocks, PROGRESS_CHECKPOINT_MS, durationMs);
  return {
    firstBuyMs: metrics.firstBuyMs,
    longestWaitMs: metrics.longestWaitMs,
    buyGapMedianMs: metrics.buyGaps.medianMs,
    sitesCompleted: durations.length,
    firstSiteMs: metrics.firstSiteMs,
    siteMedianMs: median(durations),
    siteShareInBand: durations.length === 0 ? 0 : inBand / durations.length,
    moves: events.filter((event) => event.type === 'departed').length,
    combatCaptures: metrics.sites.filter((site) => site.fought).length,
    dnaTotal: progress.dnaFromCombat + progress.dnaFromFinds,
    genomeCompleteMs: progress.genomeCompleteMs,
    unlockGapMs: unlockGap === null ? 0 : unlockGap.toMs - unlockGap.fromMs,
    longestNoBuyFirstHourMs: longestNoBuyUntil(
      events,
      Math.min(PROGRESS_CHECKPOINT_MS, durationMs),
    ),
    longestNoBuyMs: metrics.longestNoBuyMs,
  };
}

/** Fester Lauf mit den Standardwerten (`DEFAULT_BALANCE`, ohne `params`). */
export function runSnapshot({ seed, bot }: BalanceSnapshotRun): BalanceSnapshotMetrics {
  const result = runSimulation({
    seed,
    bot: bot === 'active' ? createActiveBot() : createIdleBot(),
    durationMs: SNAPSHOT_DURATION_MS,
    sampleEveryMs: SNAPSHOT_SAMPLE_EVERY_MS,
    stepMs: SNAPSHOT_STEP_MS,
  });
  return snapshotMetrics(result, bot);
}

/** Erlaubter Abstand: ±5 % des erwarteten Werts, mindestens der absolute Mindestabstand. */
export function allowedDeviation(key: BalanceSnapshotKey, expected: number): number {
  return Math.max(Math.abs(expected) * SNAPSHOT_RELATIVE_TOLERANCE, SNAPSHOT_MIN_ALLOWED[key]);
}

/** Kennzahlen außerhalb der Toleranz; `null` muss genau `null` bleiben. */
export function snapshotDeviations(
  actual: BalanceSnapshotMetrics,
  expected: BalanceSnapshotMetrics,
): BalanceSnapshotDeviation[] {
  const keys = Object.keys(expected) as BalanceSnapshotKey[];
  return keys.flatMap((key): BalanceSnapshotDeviation[] => {
    const want = expected[key];
    const got = actual[key];
    if (want === null || got === null) {
      return want === got ? [] : [{ key, expected: want, actual: got, allowed: null }];
    }
    const allowed = allowedDeviation(key, want);
    return Math.abs(got - want) <= allowed ? [] : [{ key, expected: want, actual: got, allowed }];
  });
}
