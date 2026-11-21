import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import type { SimEvent, SiteMetric } from '@app/engine/domain/runner-logic';

import { genomeCostTotal, longestUnlockGap, progressMetrics, unlocksOf } from './progress-logic';

const MIN = 60_000;
const HOUR = 60 * MIN;

function found(
  timeMs: number,
  extra: Partial<Extract<SimEvent, { type: 'found' }>> = {},
): SimEvent {
  return {
    timeMs,
    type: 'found',
    site: 0,
    entry: 'foreign-dna',
    kind: 'dna',
    replaced: null,
    dna: 10,
    unlocked: null,
    badge: null,
    ...extra,
  };
}

function site(index: number, startMs: number, fought: boolean, dna: number): SiteMetric {
  return {
    index,
    siteType: 'algal-mat',
    startMs,
    travelMs: 0,
    emptyMs: null,
    departureMs: null,
    durationMs: null,
    size: 1,
    collected: 0,
    defense: fought ? 10 : 0,
    fought,
    dna,
    soldiersBeforeDeparture: null,
    soldiersCarried: null,
    soldiersAtArrival: 0,
    losses: 0,
    soldiersAfterCapture: 0,
  };
}

const EVENTS: readonly SimEvent[] = [
  { timeMs: 0, type: 'buy', unit: 'drones' },
  { timeMs: 4 * MIN, type: 'gland', glands: 1 },
  found(8 * MIN),
  { timeMs: 8 * MIN, type: 'evolved', node: 'cilia-1', cost: 8 },
  { timeMs: 10 * MIN, type: 'departed', site: 0, target: 'algal-mat', auto: true },
  { timeMs: 11 * MIN, type: 'gland', glands: 2 },
  found(30 * MIN, { entry: 'nutrient-bubble', kind: 'food', dna: 0 }),
  found(50 * MIN, { entry: 'thermophile', kind: 'fragment', dna: 0, unlocked: 'thermosynthesis' }),
  { timeMs: 2 * HOUR, type: 'evolved', node: 'yolk-reserve', cost: 8 },
];

describe('unlocksOf', () => {
  it('zählt erste Drüse, ersten Weiterzug, ersten Fund, jede Adaption und Einzigartige (§6.3)', () => {
    expect(unlocksOf(EVENTS)).toEqual([
      { kind: 'gland', timeMs: 4 * MIN },
      { kind: 'find', timeMs: 8 * MIN },
      { kind: 'adaptation', timeMs: 8 * MIN },
      { kind: 'move', timeMs: 10 * MIN },
      { kind: 'unique', timeMs: 50 * MIN },
      { kind: 'adaptation', timeMs: 2 * HOUR },
    ]);
  });
});

describe('longestUnlockGap', () => {
  it('misst mit Laufbeginn und Fensterende', () => {
    expect(longestUnlockGap(unlocksOf(EVENTS), HOUR, 24 * HOUR)).toEqual({
      fromMs: 10 * MIN,
      toMs: 50 * MIN,
    });
  });

  it('endet bei kürzeren Läufen am Laufende und zählt ohne Freischaltung das ganze Fenster', () => {
    expect(longestUnlockGap([], HOUR, 20 * MIN)).toEqual({ fromMs: 0, toMs: 20 * MIN });
    expect(longestUnlockGap([], HOUR, 0)).toBeNull();
  });
});

describe('progressMetrics', () => {
  const sites = [site(0, 0, false, 0), site(1, 20 * MIN, true, 30), site(2, 40 * MIN, true, 5)];
  const progress = progressMetrics(EVENTS, sites);

  it('liefert die Freischalt-Zeitpunkte', () => {
    expect(progress).toMatchObject({
      firstFindMs: 8 * MIN,
      firstAdaptationMs: 8 * MIN,
      firstGlandMs: 4 * MIN,
      firstCombatCaptureMs: 20 * MIN,
      firstMoveMs: 10 * MIN,
      nodesAtCheckpoint: 1,
      nodesAtEnd: 2,
      genomeCompleteMs: null,
      glandCount: 2,
    });
  });

  it('trennt DNA aus Kampf und Funden und zählt Funde je Art', () => {
    expect(progress.dnaFromCombat).toBe(35);
    expect(progress.dnaFromFinds).toBe(10);
    expect(progress.findCount).toBe(3);
    expect(progress.findsByKind).toEqual({
      dna: 1,
      food: 1,
      buff: 0,
      fragment: 1,
      collectible: 0,
    });
    expect(progress.uniqueCount).toBe(1);
    expect(progress.badgeCount).toBe(0);
  });

  it('erkennt das vollständige Genom am letzten Knoten', () => {
    const nodes: SimEvent[] = Array.from({ length: 15 }, (_, i) => ({
      timeMs: (i + 1) * MIN,
      type: 'evolved',
      node: 'cilia-1',
      cost: 1,
    }));
    expect(progressMetrics(nodes, []).genomeCompleteMs).toBe(15 * MIN);
  });
});

describe('genomeCostTotal', () => {
  it('summiert alle Knoten (Game-Design §6.4: 3.498 DNA)', () => {
    expect(genomeCostTotal(BALANCE_V1)).toBe(3498);
  });
});
