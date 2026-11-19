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
      progress: { ...run.progress, dnaFromCombat: 1234, dnaFromFinds: 100 },
    };
    const rows = metricRows([cycle], null);
    expect(value(rows, 'Längste Strecke ohne Kampfziel')).toBe('2 h');
    expect(value(rows, 'Längster Aufenthalt an einer Futterstelle')).toBe('1 min 30 s');
    expect(value(rows, 'Reisezeit Median')).toBe('–');
    expect(value(rows, 'Einnahmen mit Kampf')).toBe('3');
    expect(value(rows, 'DNA gesamt')).toBe('1.334');
    expect(value(rows, 'DNA aus Kampf')).toBe('1.234');
    expect(value(rows, 'DNA aus Funden')).toBe('100');
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

  it('zeigt Freischalt-Zeitpunkte und Progression', () => {
    const progressed = {
      ...run,
      progress: {
        ...run.progress,
        firstGlandMs: 90_000,
        firstCombatCaptureMs: null,
        nodesAtCheckpoint: 5,
        genomeCompleteMs: 3 * HOUR_MS,
        findsByKind: { dna: 2, food: 1, buff: 0, fragment: 0, collectible: 3 },
        unlocks: [
          { kind: 'gland' as const, timeMs: 10 * 60_000 },
          { kind: 'move' as const, timeMs: 40 * 60_000 },
        ],
      },
    };
    const rows = metricRows([progressed], null);
    expect(value(rows, 'Erster Drüsenpunkt')).toBe('1 min 30 s');
    expect(value(rows, 'Erste Einnahme mit Kampf')).toBe('–');
    expect(value(rows, 'Genom-Knoten nach 1 h')).toBe('5');
    expect(value(rows, 'Genom komplett')).toBe('3 h');
    expect(value(rows, 'Funde je Art')).toBe('DNA 2 · Nahrung 1 · Sammelobjekt 3');
    expect(value(rows, 'Größter Abstand neuer Optionen (erste 60 min)')).toBe('30 min');
  });
});
