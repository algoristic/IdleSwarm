import { runSimulation } from '@app/engine/domain/runner-logic';

import { createActiveBot } from '../../domain/bots/active-bot-logic';
import { createIdleBot } from '../../domain/bots/idle-bot-logic';
import { EventType, ReducedRun, reduceResult } from '../../domain/reduce-result-logic';
import { readChartPalette } from '../echart/chart-theme';
import {
  buildChartOption,
  ChartInput,
  chartPoint,
  ChartPoint,
  formatTooltip,
} from './chart-options';

const DURATION_MS = 1_800_000;

function run(kind: 'active' | 'idle'): ReducedRun {
  const bot = kind === 'active' ? createActiveBot() : createIdleBot();
  const result = runSimulation({ seed: 'c', bot, durationMs: DURATION_MS, sampleEveryMs: 60_000 });
  return reduceResult(result, kind, 1);
}

describe('chartPoint', () => {
  it('macht Werte ≤ 0 nur auf der Log-Achse zur Lücke und behält den echten Wert', () => {
    expect(chartPoint(1, 0, true)).toEqual([1, null, 0]);
    expect(chartPoint(1, -2, true)).toEqual([1, null, -2]);
    expect(chartPoint(1, 0, false)).toEqual([1, 0, 0]);
    expect(chartPoint(1, 3, true)).toEqual([1, 3, 3]);
    expect(chartPoint(1, null, false)).toEqual([1, null, null]);
  });
});

describe('buildChartOption', () => {
  const active = run('active');
  const idle = run('idle');
  const base: ChartInput = {
    tab: 'resources',
    runs: [active, idle],
    baseline: null,
    logScale: true,
    markers: new Set<EventType>(),
    zoom: null,
    palette: readChartPalette((name) => `color${name}`),
  };
  const lines = (input: ChartInput) =>
    buildChartOption(input).series.filter((series) => series.type === 'line');
  const marks = (input: ChartInput) =>
    buildChartOption(input).series.filter((series) => series.type === 'scatter');

  it.each([
    ['resources', 5],
    ['rates', 3],
    ['decisions', 5],
    ['dna', 5],
  ] as const)('zeichnet im Reiter %s jede Größe je Bot', (tab, metrics) => {
    expect(lines({ ...base, tab })).toHaveLength(metrics * 2);
  });

  it('blendet das Zielband der Kauflücken an der Gesamtzeit von Aktiv und Idle ein (US-10.08)', () => {
    const series = lines({ ...base, tab: 'decisions' });
    const banded = series.filter((entry) => entry.markArea !== undefined);
    expect(banded.map((entry) => entry.name)).toEqual(['Aktiv · Gesamt', 'Idle · Gesamt']);
    // Aktiv 5–60 s, Idle < 5 min, jeweils über die ersten 30 min.
    expect(banded[0].markArea?.data).toEqual([
      [
        { xAxis: 0, yAxis: 5_000 },
        { xAxis: 1_800_000, yAxis: 60_000 },
      ],
    ]);
    expect(banded[1].markArea?.data).toEqual([
      [{ xAxis: 0 }, { xAxis: 1_800_000, yAxis: 300_000 }],
    ]);
    const analysis = lines({
      ...base,
      tab: 'decisions',
      runs: [{ ...active, bot: 'drone-heavy' }],
    });
    expect(analysis.some((entry) => entry.markArea !== undefined)).toBe(false);
    expect(lines(base).some((entry) => entry.markArea !== undefined)).toBe(false);
  });

  it('zeigt im DNA-Fluss die offenen Genomkosten', () => {
    const open = lines({ ...base, tab: 'dna', logScale: false }).find((entry) =>
      entry.name.startsWith('Aktiv · Verfügbare Ausgaben'),
    );
    expect((open?.data[0] as ChartPoint)[2]).toBe(13995);
  });

  it('schaltet die Achse um', () => {
    expect(buildChartOption(base).yAxis[0].type).toBe('log');
    expect(buildChartOption({ ...base, logScale: false }).yAxis[0].type).toBe('value');
  });

  it('hat auf der Log-Achse keine Werte ≤ 0', () => {
    for (const tab of ['resources', 'rates', 'decisions'] as const) {
      for (const series of lines({ ...base, tab })) {
        for (const point of series.data as ChartPoint[]) {
          expect(point[1] === null || point[1] > 0).toBe(true);
        }
      }
    }
  });

  it('legt den Basislauf gestrichelt darüber', () => {
    const series = lines({ ...base, runs: [active], baseline: [idle] });
    expect(series).toHaveLength(10);
    expect(series[0].lineStyle.type).toBe('solid');
    expect(series[5].lineStyle.type).toEqual([6, 4]);
    expect(series[5].name).toContain('Basis Idle');
  });

  it('gibt derselben Größe bei jedem Bot dieselbe Farbe', () => {
    const series = lines(base);
    expect(series[0].color).toBe(series[5].color);
    expect(series[0].color).not.toBe(series[1].color);
  });

  it('blendet Markierungen einzeln ein', () => {
    expect(marks(base)).toHaveLength(0);
    const buys = marks({ ...base, markers: new Set<EventType>(['buy']) });
    expect(buys).toHaveLength(2);
    expect(buys[0].data).toHaveLength(active.events.filter((e) => e.type === 'buy').length);
    expect(buys[0].yAxisIndex).toBe(1);
    const legend = buildChartOption({ ...base, markers: new Set<EventType>(['buy']) }).legend.data;
    expect(legend).toHaveLength(10);
  });

  it('markiert Adaptionen, Funde und Drüsenpunkte mit eigenen Symbolen (US-10.02)', () => {
    const types = new Set<EventType>(['evolved', 'found', 'gland']);
    const series = marks({ ...base, runs: [active], markers: types });
    expect(series.map((entry) => [entry.name, entry.symbol, entry.color])).toEqual([
      ['Aktiv · evolved', 'rect', 'color--sw-magenta'],
      ['Aktiv · found', 'emptyDiamond', 'color--sw-warning'],
      ['Aktiv · gland', 'emptyCircle', 'color--sw-accent'],
    ]);
    expect(series[2].data).toHaveLength(active.events.filter((e) => e.type === 'gland').length);
  });

  it('übernimmt den Zoom in beide Regler', () => {
    const zoom = buildChartOption({ ...base, zoom: { fromMs: 5, toMs: 9 } }).dataZoom;
    expect(zoom.map((entry) => [entry.startValue, entry.endValue])).toEqual([
      [5, 9],
      [5, 9],
    ]);
    expect(buildChartOption(base).dataZoom[0].startValue).toBeUndefined();
  });

  it('beschriftet die Zeitachse in h/min bis zur Laufdauer', () => {
    const { xAxis } = buildChartOption(base);
    expect(xAxis.max).toBe(DURATION_MS);
    expect(xAxis.axisLabel.formatter(5_400_000)).toBe('1 h 30 min');
  });

  it('nutzt ohne aktuellen Lauf die Dauer des Basislaufs', () => {
    expect(buildChartOption({ ...base, runs: [], baseline: [idle] }).xAxis.max).toBe(DURATION_MS);
    expect(buildChartOption({ ...base, runs: [] }).xAxis.max).toBe(0);
  });

  it('formatiert die Wartezeit-Achse als Zeit', () => {
    const axis = buildChartOption({ ...base, tab: 'decisions' }).yAxis[0];
    expect(axis.axisLabel?.formatter(90_000)).toBe('1 min 30 s');
  });

  it('liefert den Tooltip über die Option', () => {
    const { tooltip } = buildChartOption(base);
    const row = { seriesName: 'Aktiv · Nahrung', axisValue: 0, value: [0, 1, 1] };
    expect(tooltip.formatter(row)).toContain('Aktiv · Nahrung');
    expect(tooltip.formatter([row])).toContain('<b>1</b>');
  });

  describe('mit vier Bots', () => {
    const four: ChartInput = {
      ...base,
      runs: [active, idle, { ...active, bot: 'drone-heavy' }, { ...active, bot: 'soldier-heavy' }],
      markers: new Set<EventType>(['buy', 'siteEmpty', 'arrived']),
    };

    it('unterscheidet jeden Bot an Strichstärke oder Muster', () => {
      const series = lines(four);
      expect(series).toHaveLength(20);
      const styles = [0, 5, 10, 15].map((i) =>
        JSON.stringify([series[i].lineStyle.width, series[i].lineStyle.type]),
      );
      expect(new Set(styles).size).toBe(4);
      expect(series[10].color).toBe(series[0].color);
    });

    it('legt die Markierungen je Art in getrennte Zeilen ohne Überlappung', () => {
      const ys = marks(four).map((series) => (series.data[0] as number[])[1]);
      expect(ys).toHaveLength(12);
      expect(new Set(ys).size).toBe(12);
      for (let type = 0; type < 2; type++) {
        const row = ys.slice(type * 4, type * 4 + 4);
        const next = ys.slice(type * 4 + 4, type * 4 + 8);
        expect(Math.max(...row)).toBeLessThan(Math.min(...next));
      }
    });
  });

  it('färbt Linien und Markierungen aus den Tokens', () => {
    const series = buildChartOption({ ...base, markers: new Set<EventType>(['siteEmpty']) }).series;
    expect(series[0].color).toBe('color--sw-chart-1');
    expect(series[1].color).toBe('color--sw-chart-2');
    expect(series.find((s) => s.type === 'scatter')?.color).toBe('color--sw-danger');
  });
});

describe('formatTooltip', () => {
  it('zeigt Zeit und deutsche Zahlen, auch für Lücken der Log-Achse', () => {
    const html = formatTooltip(
      [
        { seriesName: 'A', marker: '*', axisValue: 3_600_000, value: [0, 1234.5, 1234.5] },
        { seriesName: 'B', axisValue: 3_600_000, value: [0, null, 0] },
        { seriesName: 'Marke', axisValue: 3_600_000, value: [0, 0.1] },
      ],
      'resources',
    );
    expect(html).toBe('<b>1 h</b><br>*A: <b>1.235</b><br>B: <b>0</b>');
  });

  it('nennt Raten mit Nachkommastelle', () => {
    expect(formatTooltip([{ seriesName: 'R', value: [0, 1.25, 1.25] }], 'rates')).toContain('1,3');
  });

  it('übersetzt Wartezeiten', () => {
    const html = formatTooltip(
      [
        { seriesName: 'a', value: [0, null, 0] },
        { seriesName: 'b', value: [0, null, null] },
        { seriesName: 'c', value: [0, 90_000, 90_000] },
      ],
      'decisions',
    );
    expect(html).toContain('a: <b>sofort</b>');
    expect(html).toContain('b: <b>nie</b>');
    expect(html).toContain('c: <b>1 min 30 s</b>');
  });
});
