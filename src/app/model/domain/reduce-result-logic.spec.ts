import { runSimulation, SiteMetric } from '@app/engine/domain/runner-logic';

import { createActiveBot } from './bots/active-bot-logic';
import {
  MAX_EVENTS_PER_TYPE,
  MAX_SAMPLES,
  MAX_SITES,
  reduceResult,
  sampleEveryFor,
  summarizeSites,
  thinEvenly,
} from './reduce-result-logic';

const HOUR_MS = 3_600_000;
const MEGABYTE = 1_000_000;

function site(
  index: number,
  durationMs: number | null,
  { travelMs = 0, dna = 0 }: { travelMs?: number; dna?: number } = {},
): SiteMetric {
  return {
    index,
    siteType: 'algal-mat',
    startMs: index * 100,
    travelMs,
    emptyMs: null,
    departureMs: durationMs === null ? null : index * 100 + durationMs,
    durationMs,
    size: 100,
    collected: 100,
    defense: 0,
    fought: dna > 0,
    dna,
    soldiersBeforeDeparture: null,
    soldiersCarried: null,
    soldiersAtArrival: 0,
    losses: 0,
    soldiersAfterCapture: 0,
  };
}

describe('sampleEveryFor', () => {
  it.each([1, 6, 24, 168])('ergibt für %d h 1000 bis 2000 Punkte in ganzen Sekunden', (hours) => {
    const durationMs = hours * HOUR_MS;
    const everyMs = sampleEveryFor(durationMs);
    const points = Math.ceil(durationMs / everyMs) + 1;
    expect(points).toBeGreaterThanOrEqual(1000);
    expect(points).toBeLessThanOrEqual(2000);
    expect(everyMs % 1000).toBe(0);
  });

  it('fällt nicht mit dem 5-Minuten-Takt des Idle-Bots zusammen', () => {
    expect(sampleEveryFor(168 * HOUR_MS) % 300_000).not.toBe(0);
  });

  it('bleibt bei kurzen Läufen positiv', () => {
    expect(sampleEveryFor(0)).toBe(1000);
  });
});

describe('thinEvenly', () => {
  const items = Array.from({ length: 101 }, (_, i) => i);

  it('lässt kurze Listen unverändert', () => {
    expect(thinEvenly(items, 200)).toBe(items);
  });

  it('wählt gleichmäßig und behält die Enden', () => {
    expect(thinEvenly(items, 5)).toEqual([0, 25, 50, 75, 100]);
  });

  it('kommt mit kleinen Grenzen zurecht', () => {
    expect(thinEvenly(items, 1)).toEqual([0]);
    expect(thinEvenly(items, 0)).toEqual([]);
  });
});

describe('summarizeSites', () => {
  it('fasst zusammen; offene Futterstellen zählen nicht zum Median', () => {
    const sites = [
      site(0, 30),
      site(1, 10, { travelMs: 5, dna: 2 }),
      site(2, 20, { travelMs: 9 }),
      site(3, null, { travelMs: 7, dna: 3 }),
    ];
    expect(summarizeSites(sites)).toEqual({
      count: 4,
      first: sites[0],
      last: sites[3],
      medianDurationMs: 20,
      medianTravelMs: 7,
      fightCount: 2,
      dnaTotal: 5,
    });
  });

  it('mittelt bei gerader Anzahl', () => {
    expect(summarizeSites([site(0, 10), site(1, 20)]).medianDurationMs).toBe(15);
  });

  it('kommt ohne Futterstellen aus', () => {
    expect(summarizeSites([])).toEqual({
      count: 0,
      first: null,
      last: null,
      medianDurationMs: null,
      medianTravelMs: null,
      fightCount: 0,
      dnaTotal: 0,
    });
  });
});

describe('reduceResult', () => {
  it('hält einen Aktiv-Lauf über 24 h unter 1 MB und erhält die Gesamtzahlen', () => {
    const durationMs = 24 * HOUR_MS;
    const result = runSimulation({
      seed: 'gross',
      bot: createActiveBot(),
      durationMs,
      sampleEveryMs: sampleEveryFor(durationMs),
    });
    const run = reduceResult(result, 'active', 1);

    expect(JSON.stringify(run).length).toBeLessThan(MEGABYTE);
    expect(run.samples.length).toBeLessThanOrEqual(MAX_SAMPLES);
    for (const type of ['buy', 'siteEmpty', 'arrived'] as const) {
      const all = result.events.filter((event) => event.type === type);
      const kept = run.events.filter((event) => event.type === type);
      expect(run.eventTotals[type]).toBe(all.length);
      expect(kept.length).toBe(Math.min(all.length, MAX_EVENTS_PER_TYPE));
      expect(kept[kept.length - 1]).toEqual(all[all.length - 1]);
    }
    expect(run.eventTotals.arrived).toBeGreaterThan(0);
    expect(run.events.some((event) => event.type === 'departed')).toBe(false);
    expect(run.metrics.sites.count).toBe(result.metrics.sites.length);
    expect(run.metrics.siteList).toEqual(result.metrics.sites);
    expect(run.metrics.firstBuyMs).toBe(result.metrics.firstBuyMs);
  }, 30_000);

  it('dünnt zu dichte Zeitreihen aus', () => {
    const result = runSimulation({
      seed: 'dicht',
      bot: createActiveBot(),
      durationMs: 3000 * 1000,
      sampleEveryMs: 1000,
    });
    const run = reduceResult(result, 'active', 0);
    expect(run.samples).toHaveLength(MAX_SAMPLES);
    expect(run.samples[run.samples.length - 1].timeMs).toBe(3000 * 1000);
  });

  it('begrenzt die Liste der Futterstellen und behält die Gesamtzahl', () => {
    const result = runSimulation({
      seed: 'viele',
      bot: createActiveBot(),
      durationMs: 1000,
      sampleEveryMs: 1000,
    });
    const sites = Array.from({ length: 2500 }, (_, i) => site(i, 10));
    const run = reduceResult({ ...result, metrics: { ...result.metrics, sites } }, 'active', 0);
    expect(run.metrics.siteList).toHaveLength(MAX_SITES);
    expect(run.metrics.siteList[MAX_SITES - 1]).toBe(sites[2499]);
    expect(run.metrics.sites.count).toBe(2500);
  });
});
