import { runSimulation } from '@app/engine/domain/runner-logic';

import { createIdleBot } from '../../domain/bots/idle-bot-logic';
import { reduceResult } from '../../domain/reduce-result-logic';
import { metricRows } from './metric-rows';

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
    expect(value(rows, 'Rechendauer')).toBe('42 ms');
    expect(value(rows, 'Futterstellen Anzahl')).toBe(String(run.metrics.sites.count));
    expect(value(rows, 'Werte am Zahlenbereich begrenzt')).toBe('nein');
  });

  it('zeigt die Zyklus-Kennzahlen', () => {
    const cycle = {
      ...run,
      metrics: {
        ...run.metrics,
        longestNoCombatCaptureMs: 2 * HOUR_MS,
        longestSiteStayMs: 90_000,
        sites: { ...run.metrics.sites, medianTravelMs: null, fightCount: 3, dnaTotal: 1234 },
      },
    };
    const rows = metricRows([cycle], null);
    expect(value(rows, 'Längste Strecke ohne Kampfziel')).toBe('2 h');
    expect(value(rows, 'Längster Aufenthalt an einer Futterstelle')).toBe('1 min 30 s');
    expect(value(rows, 'Reisezeit Median')).toBe('–');
    expect(value(rows, 'Einnahmen mit Kampf')).toBe('3');
    expect(value(rows, 'DNA gesamt')).toBe('1.234');
  });

  it('lässt den Wartezeit-Anteil dem Ausschnitt folgen', () => {
    const full = value(metricRows([run], null), 'Anteil Wartezeit im Ausschnitt (Abtastpunkte)');
    const part = value(
      metricRows([run], { fromMs: 10_000, toMs: 290_000 }),
      'Anteil Wartezeit im Ausschnitt (Abtastpunkte)',
    );
    expect(part).not.toBe(full);
    const outside = metricRows([run], { fromMs: 2 * HOUR_MS, toMs: 3 * HOUR_MS });
    expect(value(outside, 'Anteil Wartezeit im Ausschnitt (Abtastpunkte)')).toBe('–');
  });

  it('zeigt fehlende Werte als Strich', () => {
    const empty = {
      ...run,
      metrics: { ...run.metrics, firstBuyMs: null },
    };
    expect(value(metricRows([empty], null), 'Erster Kauf')).toBe('–');
  });
});
