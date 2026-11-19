import type { SiteMetric } from '@app/engine/domain/runner-logic';
import { runSimulation } from '@app/engine/domain/runner-logic';

import { createIdleBot } from '../../domain/bots/idle-bot-logic';
import { ReducedRun, reduceResult } from '../../domain/reduce-result-logic';
import { readChartPalette } from '../echart/chart-theme';
import {
  buildSiteChartOption,
  formatSiteTooltip,
  SiteChartInput,
  siteIndices,
} from './site-chart-options';

const MINUTE_MS = 60_000;

function site(index: number, overrides: Partial<SiteMetric> = {}): SiteMetric {
  return {
    index,
    siteType: 'algal-mat',
    startMs: index * 30 * MINUTE_MS,
    travelMs: index === 0 ? 0 : 5 * MINUTE_MS,
    emptyMs: null,
    departureMs: index * 30 * MINUTE_MS + 20 * MINUTE_MS,
    durationMs: 20 * MINUTE_MS,
    size: 1000,
    collected: 1234,
    defense: 0,
    fought: false,
    dna: 0,
    soldiersBeforeDeparture: index === 0 ? null : 10,
    soldiersCarried: index === 0 ? null : 8,
    soldiersAtArrival: 9,
    losses: 0,
    soldiersAfterCapture: 9,
    ...overrides,
  };
}

const base = reduceResult(
  runSimulation({
    seed: 'z',
    bot: createIdleBot(),
    durationMs: 2 * 60 * MINUTE_MS,
    sampleEveryMs: 60 * MINUTE_MS,
  }),
  'idle',
  0,
);

function withSites(bot: ReducedRun['bot'], sites: SiteMetric[]): ReducedRun {
  return {
    ...base,
    bot,
    durationMs: 2 * 60 * MINUTE_MS,
    metrics: { ...base.metrics, siteList: sites },
  };
}

const active = withSites('active', [
  site(0),
  site(1, { fought: true, defense: 50, losses: 3, soldiersAfterCapture: 6 }),
  site(2, { departureMs: null, durationMs: null }),
]);
const idle = withSites('idle', [site(0), site(1)]);
const droneHeavy = withSites('drone-heavy', [site(0)]);
const soldierHeavy = withSites('soldier-heavy', [site(0), site(3)]);

const input: SiteChartInput = {
  tab: 'siteDuration',
  runs: [active, idle, droneHeavy, soldierHeavy],
  logScale: true,
  palette: readChartPalette((name) => `color${name}`),
};

describe('siteIndices', () => {
  it('vereinigt die Nummern aller Läufe aufsteigend', () => {
    expect(siteIndices(input.runs)).toEqual([0, 1, 2, 3]);
  });
});

describe('buildSiteChartOption', () => {
  it('zeichnet Dauer je Bot als gestapelte Balken aus Reise und Aufenthalt in Minuten', () => {
    const option = buildSiteChartOption(input);
    expect(option.xAxis.data).toEqual(['0', '1', '2', '3']);
    expect(option.yAxis[0].type).toBe('value');
    expect(option.series).toHaveLength(8);
    const [travel, stay] = option.series;
    expect(travel.type).toBe('bar');
    expect(travel.stack).toBe(stay.stack);
    expect(option.series[2].stack).not.toBe(travel.stack);
    expect(travel.data.map((point) => point.value)).toEqual([0, 5, 5, null]);
    // Ohne Aufbruch zählt der Aufenthalt bis zum Laufende: 120 − 60 min.
    expect(stay.data.map((point) => point.value)).toEqual([20, 20, 60, null]);
    expect(stay.data[2].itemStyle?.opacity).toBeLessThan(1);
  });

  it('färbt je Bot aus den Tokens', () => {
    const colors = buildSiteChartOption(input).series.map((series) => series.color);
    expect(colors.filter((_, i) => i % 2 === 0)).toEqual([
      'color--sw-chart-1',
      'color--sw-chart-2',
      'color--sw-chart-3',
      'color--sw-chart-4',
    ]);
  });

  it('zeigt Soldaten vor Aufbruch, mitgekommen und nach Einnahme; Kämpfe als Raute', () => {
    const option = buildSiteChartOption({ ...input, tab: 'soldiers', runs: [active] });
    expect(option.yAxis[0].type).toBe('log');
    const [before, carried, after] = option.series;
    expect(before.data.map((point) => point.value)).toEqual([null, 10, 10]);
    expect(carried.data.map((point) => point.value)).toEqual([null, 8, 8]);
    expect(after.data.map((point) => point.value)).toEqual([9, 6, 9]);
    expect(after.data[1].symbol).toBe('diamond');
    expect(after.data[0].symbol).toBeUndefined();
  });

  it('macht 0 Soldaten nur auf der Log-Achse zur Lücke', () => {
    const empty = withSites('active', [site(0, { soldiersAfterCapture: 0 })]);
    const after = (logScale: boolean) =>
      buildSiteChartOption({ ...input, tab: 'soldiers', runs: [empty], logScale }).series[2].data;
    expect(after(true)[0].value).toBeNull();
    expect(after(false)[0].value).toBe(0);
  });

  it('hat keinen Zoom-Regler', () => {
    expect(buildSiteChartOption(input).dataZoom).toEqual([]);
  });
});

describe('formatSiteTooltip', () => {
  const indices = [0, 1, 2, 3];

  it('nennt Typ, Reise, Aufenthalt und Ertrag je Bot mit Futterstelle', () => {
    const html = formatSiteTooltip(
      [{ seriesIndex: 0, dataIndex: 2, marker: '*' }],
      'siteDuration',
      [active, idle],
      indices,
    );
    expect(html).toBe(
      '<b>Futterstelle 2</b><br>*Aktiv: Algenmatte · Reise 5 min · Aufenthalt 1 h bis Laufende · Ertrag 1.234',
    );
  });

  it('nennt Soldaten, Verluste und Kampf', () => {
    const html = formatSiteTooltip([{ dataIndex: 1 }], 'soldiers', [active, idle], indices);
    expect(html).toContain(
      'Aktiv: vor Aufbruch 10 · mitgekommen 8 · bei Ankunft 9 · Verluste 3 · nach Einnahme 6 · Kampf, Abwehr 50',
    );
    expect(html).toContain('Idle: vor Aufbruch 10');
    expect(html).toContain('ohne Kampf');
  });

  it('bleibt außerhalb der Achse leer', () => {
    expect(formatSiteTooltip([], 'soldiers', [active], indices)).toBe('');
  });
});
