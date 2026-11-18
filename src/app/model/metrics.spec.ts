import { createIdleBot } from '../core/sim/bots/idle';
import { runSimulation } from '../core/sim/runner';
import { metricRows } from './metrics';
import { MODEL_TEXTS } from './model-texts.de';
import { reduceResult } from './sim/reduce-result';

const HOUR_MS = 3_600_000;

describe('metricRows', () => {
  const run = reduceResult(
    runSimulation({
      seed: 'm',
      bot: createIdleBot(),
      durationMs: HOUR_MS,
      sampleEveryMs: 10_000,
    }),
    'idle',
    42,
  );
  const value = (rows: ReturnType<typeof metricRows>, label: string) =>
    rows.find((row) => row.label === label)?.values[0];

  it('enthält alle Kennzahlen je Bot', () => {
    const rows = metricRows([run, run], null);
    expect(rows.every((row) => row.values.length === 2)).toBe(true);
    expect(value(rows, MODEL_TEXTS.computeTime)).toBe('42 ms');
    expect(value(rows, MODEL_TEXTS.siteCount)).toBe(String(run.metrics.sites.count));
    expect(value(rows, MODEL_TEXTS.saturated)).toBe(MODEL_TEXTS.saturatedNo);
  });

  it('lässt den Wartezeit-Anteil dem Ausschnitt folgen', () => {
    const full = value(metricRows([run], null), MODEL_TEXTS.waitRange);
    const part = value(metricRows([run], { fromMs: 10_000, toMs: 290_000 }), MODEL_TEXTS.waitRange);
    expect(part).not.toBe(full);
    const outside = metricRows([run], { fromMs: 2 * HOUR_MS, toMs: 3 * HOUR_MS });
    expect(value(outside, MODEL_TEXTS.waitRange)).toBe(MODEL_TEXTS.noValue);
  });

  it('zeigt fehlende Werte als Strich', () => {
    const empty = {
      ...run,
      metrics: { ...run.metrics, firstBuyMs: null },
    };
    expect(value(metricRows([empty], null), MODEL_TEXTS.firstBuy)).toBe(MODEL_TEXTS.noValue);
  });
});
