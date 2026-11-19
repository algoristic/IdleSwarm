import { runSimulation } from '@app/engine/domain/runner-logic';
import type { SiteMetric } from '@app/engine/domain/runner-logic';

import { createIdleBot } from './bots/idle-bot-logic';
import { botPacing, pacingWarnings } from './pacing-targets-logic';
import { ReducedRun, reduceResult } from './reduce-result-logic';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;

function site(index: number, startMs: number, durationMs: number | null): SiteMetric {
  return {
    index,
    siteType: 'algal-mat',
    startMs,
    travelMs: 0,
    emptyMs: null,
    departureMs: durationMs === null ? null : startMs + durationMs,
    durationMs,
    size: 1,
    collected: 0,
    defense: 0,
    fought: false,
    dna: 0,
    soldiersBeforeDeparture: null,
    soldiersCarried: null,
    soldiersAtArrival: 0,
    losses: 0,
    soldiersAfterCapture: 0,
  };
}

describe('Zielband-Warnungen (US-10.08)', () => {
  const base = reduceResult(
    runSimulation({ seed: 'z', bot: createIdleBot(), durationMs: 2 * HOUR, sampleEveryMs: HOUR }),
    'idle',
    0,
  );

  /** Ein Aktiv-Lauf, der alle Bänder bis auf die genannten Abweichungen einhält. */
  function activeRun(overrides: Partial<ReducedRun['metrics']> = {}): ReducedRun {
    return {
      ...base,
      bot: 'active',
      durationMs: 2 * HOUR,
      metrics: {
        ...base.metrics,
        firstBuyMs: 0,
        buyGaps: { count: 10, medianMs: 20 * SEC, maxMs: 50 * SEC },
        longestWaitMs: 30 * SEC,
        longestWaitFromMs: 0,
        longestNoBuyMs: 5 * MIN,
        longestNoBuyFromMs: 10 * MIN,
        siteList: [site(0, 0, 10 * MIN), site(1, 11 * MIN, 5 * MIN), site(2, 17 * MIN, null)],
        ...overrides,
      },
      progress: {
        ...base.progress,
        unlocks: [10, 20, 30, 40, 50].map((m) => ({
          kind: 'adaptation' as const,
          timeMs: m * MIN,
        })),
      },
    };
  }

  it('meldet nichts, wenn alle Messungen im Band liegen', () => {
    // Erster Kauf, Median, Wartezeit, zwei abgeschlossene Futterstellen, Strecke, Abstand.
    expect(botPacing(activeRun())).toEqual({ bot: 'active', checked: 7, warnings: [] });
  });

  it('listet Abweichungen mit Istwert, Band und Zeitraum, zeitlich geordnet', () => {
    const run = activeRun({
      firstBuyMs: 12 * SEC,
      longestWaitMs: 109 * SEC,
      longestWaitFromMs: 0,
      longestNoBuyMs: 119 * MIN,
      longestNoBuyFromMs: HOUR,
      siteList: [site(0, 0, 10 * MIN), site(1, 11 * MIN, 20 * MIN)],
    });
    const result = botPacing(run);
    expect(result?.warnings.map((w) => [w.target, w.measure, w.valueMs, w.site])).toEqual([
      ['firstDecision', 'firstBuy', 12 * SEC, null],
      ['buyInterval', 'longestWait', 109 * SEC, null],
      ['siteDuration', 'siteDuration', 20 * MIN, 1],
      ['longestDrought', 'longestNoBuy', 119 * MIN, null],
    ]);
    expect(result?.warnings[1]).toMatchObject({
      span: { fromMs: 0, toMs: 109 * SEC },
      upperOnly: true,
      band: { max: { value: 60, inclusive: true }, unit: 'second' },
    });
    expect(result?.warnings[2].span).toEqual({ fromMs: 11 * MIN, toMs: 31 * MIN });
  });

  it('bewertet nie gekauft als Abweichung', () => {
    const warnings = botPacing(activeRun({ firstBuyMs: null }))?.warnings ?? [];
    expect(warnings[0]).toMatchObject({ target: 'firstDecision', valueMs: null });
  });

  it('prüft den Abstand neuer Optionen in der ersten Stunde gegen 5–15 min', () => {
    const run = { ...activeRun(), progress: { ...base.progress, unlocks: [] } };
    const warning = botPacing(run)?.warnings.find((w) => w.measure === 'unlockGap');
    expect(warning).toMatchObject({ valueMs: HOUR, span: { fromMs: 0, toMs: HOUR } });
  });

  it('bewertet Idle mit eigenen Bändern und Analyse-Bots gar nicht', () => {
    const idle = { ...activeRun({ longestWaitMs: 4 * MIN }), bot: 'idle' as const };
    // Futterstellen 10 und 5 min: nur die zweite liegt unter 10–60 min.
    expect(botPacing(idle)?.warnings.map((w) => w.measure)).toEqual(['siteDuration']);
    const analysis = { ...activeRun(), bot: 'drone-heavy' as const };
    expect(pacingWarnings([analysis, idle]).map((entry) => entry.bot)).toEqual(['idle']);
  });
});
