import type { SiteMetric } from '@app/engine/domain/runner-logic';
import { formatAxisValue, formatElapsed } from '@app/shared/util/format/elapsed-format';
import { formatNum } from '@app/shared/util/format/format';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { ReducedRun } from '../../domain/reduce-result-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import type { ChartPalette } from '../echart/chart-theme';
import type { SiteTab } from './model-charts.model';

/** Die Dauer-Achse zählt in Minuten; der Tooltip zeigt die genaue Zeit. */
const MS_PER_MINUTE = 60_000;
const TRAVEL_OPACITY = 0.45;
const OPEN_STAY_OPACITY = 0.55;
const SYMBOL_SIZE = 6;
const FIGHT_SYMBOL_SIZE = 11;

const T = {
  stay: $localize`:@@uiModel-siteChartOptions-stay:Aufenthalt`,
  travel: $localize`:@@uiModel-siteChartOptions-travel:Reise`,
  collected: $localize`:@@uiModel-siteChartOptions-collected:Ertrag`,
  untilEnd: $localize`:@@uiModel-siteChartOptions-untilEnd:bis Laufende`,
  before: $localize`:@@uiModel-siteChartOptions-before:vor Aufbruch`,
  carried: $localize`:@@uiModel-siteChartOptions-carried:mitgekommen`,
  atArrival: $localize`:@@uiModel-siteChartOptions-atArrival:bei Ankunft`,
  losses: $localize`:@@uiModel-siteChartOptions-losses:Verluste`,
  after: $localize`:@@uiModel-siteChartOptions-after:nach Einnahme`,
  fight: $localize`:@@uiModel-siteChartOptions-fight:Kampf, Abwehr`,
  noFight: $localize`:@@uiModel-siteChartOptions-noFight:ohne Kampf`,
  site: $localize`:@@uiModel-siteChartOptions-site:Futterstelle`,
  siteAxis: $localize`:@@uiModel-siteChartOptions-siteAxis:Futterstelle (0 = Start)`,
  minutesAxis: $localize`:@@uiModel-siteChartOptions-minutesAxis:min`,
  soldiersAxis: $localize`:@@uiModel-siteChartOptions-soldiersAxis:Soldaten`,
} as const;

const NO_VALUE = '–';

export interface SiteChartInput {
  readonly tab: SiteTab;
  readonly runs: readonly ReducedRun[];
  readonly logScale: boolean;
  readonly palette: ChartPalette;
}

export interface SiteTooltipRow {
  readonly seriesIndex?: number;
  readonly dataIndex?: number;
  readonly marker?: unknown;
}

export interface SiteValue {
  readonly value: number | null;
  readonly symbol?: string;
  readonly symbolSize?: number;
  readonly itemStyle?: { readonly opacity: number };
}

export interface SiteSeries {
  readonly name: string;
  readonly type: 'bar' | 'line';
  readonly color: string;
  readonly stack?: string;
  readonly symbol?: string;
  readonly symbolSize?: number;
  readonly connectNulls?: boolean;
  readonly itemStyle?: { readonly opacity: number };
  readonly lineStyle?: { readonly width: number; readonly type: 'solid' | 'dashed' | 'dotted' };
  readonly emphasis: { readonly disabled: boolean };
  readonly data: readonly SiteValue[];
}

/** Nummern aller Futterstellen der Läufe, aufsteigend; ausgedünnte Listen haben Lücken. */
export function siteIndices(runs: readonly ReducedRun[]): number[] {
  const indices = new Set(runs.flatMap((run) => run.metrics.siteList.map((site) => site.index)));
  return [...indices].sort((a, b) => a - b);
}

/** Aufenthalt von der Ankunft bis zum Aufbruch; ohne Aufbruch bis zum Laufende. */
export function stayMs(site: SiteMetric, durationMs: number): number {
  return site.durationMs ?? durationMs - site.startMs;
}

function sitesByIndex(run: ReducedRun): Map<number, SiteMetric> {
  return new Map(run.metrics.siteList.map((site) => [site.index, site]));
}

const orDash = (value: number | null, format: (value: number) => string): string =>
  value === null ? NO_VALUE : format(value);

/** Die Log-Achse kennt keine Werte ≤ 0; sie werden zur Lücke. */
function soldierValue(value: number | null, logScale: boolean): number | null {
  return value !== null && logScale && value <= 0 ? null : value;
}

function durationSeries(run: ReducedRun, indices: readonly number[], color: string): SiteSeries[] {
  const sites = sitesByIndex(run);
  const bot = BOT_LABELS[run.bot];
  const bar = { type: 'bar' as const, stack: run.bot, color, emphasis: { disabled: true } };
  return [
    {
      ...bar,
      name: `${bot} · ${T.travel}`,
      itemStyle: { opacity: TRAVEL_OPACITY },
      data: indices.map((index): SiteValue => {
        const site = sites.get(index);
        return { value: site === undefined ? null : site.travelMs / MS_PER_MINUTE };
      }),
    },
    {
      ...bar,
      name: `${bot} · ${T.stay}`,
      data: indices.map((index): SiteValue => {
        const site = sites.get(index);
        if (site === undefined) {
          return { value: null };
        }
        const open = site.departureMs === null;
        return {
          value: stayMs(site, run.durationMs) / MS_PER_MINUTE,
          itemStyle: { opacity: open ? OPEN_STAY_OPACITY : 1 },
        };
      }),
    },
  ];
}

function soldierSeries(
  run: ReducedRun,
  indices: readonly number[],
  color: string,
  logScale: boolean,
): SiteSeries[] {
  const sites = sitesByIndex(run);
  const bot = BOT_LABELS[run.bot];
  const line = (
    label: string,
    symbol: string,
    type: 'solid' | 'dashed' | 'dotted',
    value: (site: SiteMetric) => SiteValue,
  ): SiteSeries => ({
    name: `${bot} · ${label}`,
    type: 'line' as const,
    color,
    symbol,
    symbolSize: SYMBOL_SIZE,
    connectNulls: false,
    lineStyle: { width: 1.5, type },
    emphasis: { disabled: true },
    data: indices.map((index): SiteValue => {
      const site = sites.get(index);
      return site === undefined ? { value: null } : value(site);
    }),
  });
  return [
    line(T.before, 'emptyCircle', 'dashed', (site) => ({
      value: soldierValue(site.soldiersBeforeDeparture, logScale),
    })),
    line(T.carried, 'triangle', 'dotted', (site) => ({
      value: soldierValue(site.soldiersCarried, logScale),
    })),
    // Einnahmen mit Kampf fallen als größere Raute auf.
    line(T.after, 'circle', 'solid', (site) => ({
      value: soldierValue(site.soldiersAfterCapture, logScale),
      ...(site.fought ? { symbol: 'diamond', symbolSize: FIGHT_SYMBOL_SIZE } : {}),
    })),
  ];
}

function durationLine(site: SiteMetric, run: ReducedRun): string {
  const stay = formatElapsed(stayMs(site, run.durationMs));
  const open = site.departureMs === null ? ` ${T.untilEnd}` : '';
  return [
    SITE_TYPE_LABELS[site.siteType],
    `${T.travel} ${formatElapsed(site.travelMs)}`,
    `${T.stay} ${stay}${open}`,
    `${T.collected} ${formatNum(site.collected)}`,
  ].join(' · ');
}

function soldierLine(site: SiteMetric): string {
  return [
    `${T.before} ${orDash(site.soldiersBeforeDeparture, formatNum)}`,
    `${T.carried} ${orDash(site.soldiersCarried, formatNum)}`,
    `${T.atArrival} ${formatNum(site.soldiersAtArrival)}`,
    `${T.losses} ${formatNum(site.losses)}`,
    `${T.after} ${formatNum(site.soldiersAfterCapture)}`,
    site.fought ? `${T.fight} ${formatNum(site.defense)}` : T.noFight,
  ].join(' · ');
}

/** Tooltip je Futterstelle aus den Läufen selbst; die Zeilen liefern nur Position und Farbe. */
export function formatSiteTooltip(
  rows: readonly SiteTooltipRow[],
  tab: SiteTab,
  runs: readonly ReducedRun[],
  indices: readonly number[],
): string {
  const index = indices[rows[0]?.dataIndex ?? -1];
  if (index === undefined) {
    return '';
  }
  const perRun = tab === 'siteDuration' ? 2 : 3;
  const markers = new Map<number, string>();
  for (const row of rows) {
    const runIndex = Math.floor((row.seriesIndex ?? 0) / perRun);
    if (!markers.has(runIndex) && typeof row.marker === 'string') {
      markers.set(runIndex, row.marker);
    }
  }
  const lines = runs.flatMap((run, runIndex) => {
    const site = sitesByIndex(run).get(index);
    if (site === undefined) {
      return [];
    }
    const detail = tab === 'siteDuration' ? durationLine(site, run) : soldierLine(site);
    return [`${markers.get(runIndex) ?? ''}${BOT_LABELS[run.bot]}: ${detail}`];
  });
  return [`<b>${T.site} ${formatNum(index)}</b>`, ...lines].join('<br>');
}

/** ECharts-Option der Reiter je Futterstelle; die Farbe steht hier für den Bot. */
export function buildSiteChartOption(input: SiteChartInput) {
  const { tab, runs, logScale, palette } = input;
  const indices = siteIndices(runs);
  const isDuration = tab === 'siteDuration';
  const series = runs.flatMap((run, botIndex): SiteSeries[] => {
    const color = palette.series[botIndex % palette.series.length];
    return isDuration
      ? durationSeries(run, indices, color)
      : soldierSeries(run, indices, color, logScale);
  });
  const useLog = !isDuration && logScale;

  return {
    animation: false,
    legend: { type: 'scroll' as const, top: 0, data: series.map((entry) => entry.name) },
    grid: { left: 76, right: 20, top: 36, bottom: 44 },
    tooltip: {
      trigger: 'axis' as const,
      confine: true,
      axisPointer: { type: 'shadow' as const },
      formatter: (rows: SiteTooltipRow | SiteTooltipRow[]) =>
        formatSiteTooltip(Array.isArray(rows) ? rows : [rows], tab, runs, indices),
    },
    xAxis: {
      type: 'category' as const,
      name: T.siteAxis,
      nameLocation: 'middle' as const,
      nameGap: 28,
      data: indices.map(String),
      axisLabel: { hideOverlap: true },
    },
    yAxis: [
      {
        type: useLog ? ('log' as const) : ('value' as const),
        name: isDuration ? T.minutesAxis : T.soldiersAxis,
        // Senkrecht neben der Achse; oben läge der Name unter der Legende.
        nameLocation: 'middle' as const,
        nameGap: 60,
        axisLabel: { formatter: (value: number) => formatAxisValue(value) },
      },
    ],
    // Ohne Zeitachse kein Zoom; leere Liste entfernt die Regler der Zeitreihen.
    dataZoom: [],
    series,
  };
}

export type SiteChartOption = ReturnType<typeof buildSiteChartOption>;
