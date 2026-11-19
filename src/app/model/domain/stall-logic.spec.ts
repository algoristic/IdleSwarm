import { runSimulation, SiteMetric } from '@app/engine/domain/runner-logic';

import { createIdleBot } from './bots/idle-bot-logic';
import { reduceResult, ReducedRun } from './reduce-result-logic';
import {
  botStalls,
  defaultStallThreshold,
  parseStallThresholdMinutes,
  stallThresholdMs,
} from './stall-logic';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

function site(
  index: number,
  startMs: number,
  departureMs: number | null,
  fought: boolean,
): SiteMetric {
  return {
    index,
    siteType: 'algal-mat',
    startMs,
    travelMs: 0,
    emptyMs: null,
    departureMs,
    durationMs: departureMs === null ? null : departureMs - startMs,
    size: 100,
    collected: 100,
    defense: fought ? 5 : 0,
    fought,
    dna: fought ? 1 : 0,
    soldiersBeforeDeparture: null,
    soldiersCarried: null,
    soldiersAtArrival: 0,
    losses: 0,
    soldiersAfterCapture: 0,
  };
}

describe('parseStallThresholdMinutes', () => {
  it.each([
    ['60', 60],
    [' 5 ', 5],
    ['1', 1],
    ['90,0', 90],
  ])('liest %s als %d', (text, minutes) => {
    expect(parseStallThresholdMinutes(text)).toBe(minutes);
  });

  it.each(['0', '-5', '1,5', 'abc', '', '1.000'])('lehnt %s ab', (text) => {
    expect(parseStallThresholdMinutes(text)).toBeNull();
  });

  it('rechnet in Millisekunden und startet mit 60 min', () => {
    expect(stallThresholdMs(defaultStallThreshold())).toBe(HOUR_MS);
    expect(stallThresholdMs({ minutes: 'x' })).toBeNull();
  });
});

describe('botStalls', () => {
  const base = reduceResult(
    runSimulation({
      seed: 's',
      bot: createIdleBot(),
      durationMs: 5 * HOUR_MS,
      sampleEveryMs: HOUR_MS,
    }),
    'idle',
    0,
  );
  const sites = [
    site(0, 0, 30 * MINUTE_MS, false),
    site(1, 40 * MINUTE_MS, 50 * MINUTE_MS, true),
    site(2, 3 * HOUR_MS, null, false),
  ];
  const run: ReducedRun = {
    ...base,
    durationMs: 5 * HOUR_MS,
    metrics: {
      ...base.metrics,
      sites: { ...base.metrics.sites, count: 3 },
      siteList: sites,
    },
  };

  it('listet beide Arten über der Schwelle zeitlich geordnet, offene bis Laufende', () => {
    expect(botStalls([run], HOUR_MS)).toEqual([
      {
        bot: 'idle',
        approximate: false,
        stalls: [
          {
            kind: 'noCombatCapture',
            fromMs: 40 * MINUTE_MS,
            toMs: 5 * HOUR_MS,
            durationMs: 260 * MINUTE_MS,
            open: true,
          },
          {
            kind: 'noDeparture',
            fromMs: 3 * HOUR_MS,
            toMs: 5 * HOUR_MS,
            durationMs: 2 * HOUR_MS,
            open: true,
          },
        ],
      },
    ]);
  });

  it('zählt nur Strecken, die strikt länger als die Schwelle sind', () => {
    const [{ stalls }] = botStalls([run], 30 * MINUTE_MS);
    expect(stalls.map((stall) => [stall.kind, stall.fromMs])).toEqual([
      ['noCombatCapture', 0],
      ['noCombatCapture', 40 * MINUTE_MS],
      ['noDeparture', 3 * HOUR_MS],
    ]);
  });

  it('meldet keine Stillstände unter einer hohen Schwelle', () => {
    expect(botStalls([run], 6 * HOUR_MS)[0].stalls).toEqual([]);
  });

  it('kennzeichnet ausgedünnte Listen als Näherung', () => {
    const thinned = {
      ...run,
      metrics: { ...run.metrics, sites: { ...run.metrics.sites, count: 9 } },
    };
    expect(botStalls([thinned], HOUR_MS)[0].approximate).toBe(true);
  });
});
