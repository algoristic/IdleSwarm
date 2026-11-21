import type { SimEvent } from '@app/engine/domain/runner-logic';
import { MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';

import {
  allowedDeviation,
  longestNoBuyUntil,
  runSnapshot,
  snapshotDeviations,
} from './balance-snapshot-logic';
import { BALANCE_SNAPSHOTS } from './balance-snapshot.data';
import type { BalanceSnapshotMetrics } from './models/balance-snapshot.model';

/** Ein Lauf über 24 h dauert rund 1 s („Aktiv“) bzw. 0,5 s („Idle“); im Abdeckungslauf länger. */
const SNAPSHOT_TIMEOUT_MS = 60 * MS_PER_SECOND;

const METRICS: BalanceSnapshotMetrics = {
  firstBuyMs: 0,
  longestWaitMs: 40_000,
  buyGapMedianMs: 6_000,
  sitesCompleted: 100,
  firstSiteMs: 20 * MS_PER_MINUTE,
  siteMedianMs: 12 * MS_PER_MINUTE,
  siteShareInBand: 0.8,
  moves: 100,
  combatCaptures: 3,
  dnaTotal: 1_000,
  genomeCompleteMs: null,
  unlockGapMs: 15 * MS_PER_MINUTE,
  longestNoBuyFirstHourMs: 5 * MS_PER_MINUTE,
  longestNoBuyMs: 10 * MS_PER_MINUTE,
};

describe('Toleranz der Balancing-Snapshots', () => {
  it('erlaubt 5 % relativ, mindestens den absoluten Abstand der Kennzahl', () => {
    expect(allowedDeviation('dnaTotal', 1_000)).toBe(50);
    expect(allowedDeviation('combatCaptures', 3)).toBe(1);
    expect(allowedDeviation('firstBuyMs', 0)).toBe(2_000);
    expect(allowedDeviation('siteShareInBand', 0.8)).toBeCloseTo(0.04);
  });

  it('meldet nur Kennzahlen außerhalb der Toleranz', () => {
    const actual: BalanceSnapshotMetrics = {
      ...METRICS,
      dnaTotal: 1_050,
      combatCaptures: 5,
      siteMedianMs: 13 * MS_PER_MINUTE,
    };
    expect(snapshotDeviations(actual, METRICS)).toEqual([
      {
        key: 'siteMedianMs',
        expected: 12 * MS_PER_MINUTE,
        actual: 13 * MS_PER_MINUTE,
        allowed: 36_000,
      },
      { key: 'combatCaptures', expected: 3, actual: 5, allowed: 1 },
    ]);
  });

  it('verlangt `null` genau dann, wenn es erwartet ist', () => {
    expect(snapshotDeviations({ ...METRICS, genomeCompleteMs: 1 }, METRICS)).toEqual([
      { key: 'genomeCompleteMs', expected: null, actual: 1, allowed: null },
    ]);
    expect(snapshotDeviations({ ...METRICS, firstBuyMs: null }, METRICS)).toEqual([
      { key: 'firstBuyMs', expected: 0, actual: null, allowed: null },
    ]);
  });
});

describe('longestNoBuyUntil', () => {
  it('misst die längste Strecke ohne Kauf bis zum Fensterende', () => {
    const events: SimEvent[] = [
      { timeMs: 10_000, type: 'buy', unit: 'drones' },
      { timeMs: 20_000, type: 'siteEmpty', site: 0 },
      { timeMs: 50_000, type: 'gland', glands: 1 },
      { timeMs: 90_000, type: 'evolved', node: 'cilia-1', cost: 3 },
    ];
    expect(longestNoBuyUntil(events, 60_000)).toBe(40_000);
    expect(longestNoBuyUntil(events, 200_000)).toBe(110_000);
    expect(longestNoBuyUntil([], 60_000)).toBe(60_000);
  });
});

/**
 * Feste Läufe mit den Standardwerten (technisches Konzept §5.6, US-10.09). Schlägt ein Lauf fehl,
 * hat sich das Pacing verschoben. Gewollte Änderungen an Werten oder Regeln aktualisieren
 * `balance-snapshot.data.ts` bewusst und begründet (Game-Design §6.6), nie automatisch.
 */
describe('Balancing-Snapshots', () => {
  it.each(BALANCE_SNAPSHOTS)(
    'Seed $seed, Bot $bot bleibt in der Toleranz',
    (snapshot) => {
      expect(snapshotDeviations(runSnapshot(snapshot), snapshot.metrics)).toEqual([]);
    },
    SNAPSHOT_TIMEOUT_MS,
  );
});
