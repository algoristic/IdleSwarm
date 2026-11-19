import type { SimEvent, SimSample } from '@app/engine/domain/runner-logic';
import { formatAxisValue, formatElapsed } from '@app/shared/util/format/elapsed-format';
import { formatNum, formatRate } from '@app/shared/util/format/format';

import type { BotKind } from '../../domain/models/sim.model';
import type { EventType, ReducedRun } from '../../domain/reduce-result-logic';
import type { TimeRange } from '../../domain/wait-share-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import type { ChartPalette } from '../echart/chart-theme';
import type { SampleTab } from './model-charts.model';

const NO_VALUE = '–';
const SOON = $localize`:@@uiModel-chartOptions-soon:sofort`;
const NEVER = $localize`:@@uiModel-chartOptions-never:nie`;
const BASELINE_PREFIX = $localize`:@@uiModel-chartOptions-baselinePrefix:Basis`;

const SERIES_LABELS = {
  food: $localize`:@@uiModel-chartOptions-series-food:Nahrung`,
  stock: $localize`:@@uiModel-chartOptions-series-stock:Vorrat`,
  queens: $localize`:@@uiModel-chartOptions-series-queens:Königinnen`,
  drones: $localize`:@@uiModel-chartOptions-series-drones:Drohnen`,
  soldiers: $localize`:@@uiModel-chartOptions-series-soldiers:Soldaten`,
  foodPerSecond: $localize`:@@uiModel-chartOptions-series-foodPerSecond:Nahrung/s`,
  netFoodPerSecond: $localize`:@@uiModel-chartOptions-series-netFoodPerSecond:Netto/s`,
  eggsPerMinute: $localize`:@@uiModel-chartOptions-series-eggsPerMinute:Eier/min`,
  nextQueen: $localize`:@@uiModel-chartOptions-series-nextQueen:Königin`,
  nextDrone: $localize`:@@uiModel-chartOptions-series-nextDrone:Drohne`,
  nextSoldier: $localize`:@@uiModel-chartOptions-series-nextSoldier:Soldat`,
  nextTotal: $localize`:@@uiModel-chartOptions-series-nextTotal:Gesamt`,
} as const;

interface Metric {
  readonly label: string;
  readonly value: (sample: SimSample) => number | null;
}

interface TabDefinition {
  readonly metrics: readonly Metric[];
  readonly formatValue: (value: number | null) => string;
  readonly formatAxis: (value: number) => string;
}

const orDash = (format: (value: number) => string) => (value: number | null) =>
  value === null ? NO_VALUE : format(value);

function formatWait(value: number | null): string {
  if (value === null) {
    return NEVER;
  }
  return value === 0 ? SOON : formatElapsed(value);
}

export const CHART_TABS: Readonly<Record<SampleTab, TabDefinition>> = {
  resources: {
    formatValue: orDash(formatNum),
    formatAxis: formatAxisValue,
    metrics: [
      { label: SERIES_LABELS.food, value: (sample) => sample.food },
      { label: SERIES_LABELS.stock, value: (sample) => sample.stock },
      { label: SERIES_LABELS.queens, value: (sample) => sample.queens },
      { label: SERIES_LABELS.drones, value: (sample) => sample.drones },
      { label: SERIES_LABELS.soldiers, value: (sample) => sample.soldiers },
    ],
  },
  rates: {
    formatValue: orDash(formatRate),
    formatAxis: formatAxisValue,
    metrics: [
      { label: SERIES_LABELS.foodPerSecond, value: (sample) => sample.foodPerSecond },
      { label: SERIES_LABELS.netFoodPerSecond, value: (sample) => sample.netFoodPerSecond },
      { label: SERIES_LABELS.eggsPerMinute, value: (sample) => sample.eggsPerMinute },
    ],
  },
  decisions: {
    formatValue: formatWait,
    formatAxis: formatElapsed,
    metrics: [
      { label: SERIES_LABELS.nextQueen, value: (sample) => sample.nextBuyMs.queens },
      { label: SERIES_LABELS.nextDrone, value: (sample) => sample.nextBuyMs.drones },
      { label: SERIES_LABELS.nextSoldier, value: (sample) => sample.nextBuyMs.soldiers },
      { label: SERIES_LABELS.nextTotal, value: (sample) => sample.nextBuyMs.total },
    ],
  },
};

const MARKER_SYMBOLS: Readonly<Record<EventType, string>> = {
  buy: 'triangle',
  siteEmpty: 'diamond',
  arrived: 'circle',
};
const MARKER_ORDER: readonly EventType[] = ['buy', 'siteEmpty', 'arrived'];
/**
 * Lage der Markierungen auf der verdeckten 0–1-Achse, unabhängig von der Wertachse. Je Art eine
 * Zeile, darin je Bot ein Versatz; die Zeile wächst mit der Zahl der Bots, damit sich Arten nicht
 * überlagern (bei zwei Bots wie bisher 0,05).
 */
const MARKER_BASE = 0.03;
const MARKER_BOT_STEP = 0.02;
const MARKER_TYPE_GAP = 0.01;
const MIN_MARKER_BOTS = 2;
const MARKER_AXIS_INDEX = 1;

const BASELINE_DASH = [6, 4];

interface BotLine {
  readonly width: number;
  readonly opacity: number;
  readonly type: 'solid' | readonly number[];
}

/** Die Farbe steht für die Größe; Bots unterscheiden sich an Strichstärke und Muster. */
const BOT_LINES: Readonly<Record<BotKind, BotLine>> = {
  active: { width: 2, opacity: 1, type: 'solid' },
  idle: { width: 1.25, opacity: 0.7, type: 'solid' },
  'drone-heavy': { width: 1.5, opacity: 0.9, type: [2, 3] },
  'soldier-heavy': { width: 1.5, opacity: 0.9, type: [10, 3, 2, 3] },
};

export interface ChartInput {
  readonly tab: SampleTab;
  readonly runs: readonly ReducedRun[];
  readonly baseline: readonly ReducedRun[] | null;
  readonly logScale: boolean;
  readonly markers: ReadonlySet<EventType>;
  readonly zoom: TimeRange | null;
  readonly palette: ChartPalette;
}

/** `[Zeit, gezeichneter Wert, echter Wert]`; der echte Wert bleibt für den Tooltip erhalten. */
export type ChartPoint = readonly [number, number | null, number | null];

export interface TooltipRow {
  readonly seriesName: string;
  readonly marker?: unknown;
  readonly axisValue?: unknown;
  readonly value?: unknown;
}

/** Die Log-Achse kennt keine Werte ≤ 0; sie werden zur Lücke, der Tooltip zeigt sie weiter. */
export function chartPoint(timeMs: number, value: number | null, logScale: boolean): ChartPoint {
  const plotted = value !== null && logScale && value <= 0 ? null : value;
  return [timeMs, plotted, value];
}

function lineSeries(
  palette: ChartPalette,
  run: ReducedRun,
  metric: Metric,
  colorIndex: number,
  logScale: boolean,
  isBaseline: boolean,
) {
  const bot = BOT_LABELS[run.bot];
  const prefix = isBaseline ? `${BASELINE_PREFIX} ${bot}` : bot;
  const line = BOT_LINES[run.bot];
  return {
    name: `${prefix} · ${metric.label}`,
    type: 'line' as const,
    showSymbol: false,
    connectNulls: false,
    color: palette.series[colorIndex % palette.series.length],
    lineStyle: {
      width: line.width,
      opacity: line.opacity * (isBaseline ? 0.7 : 1),
      type: isBaseline ? BASELINE_DASH : line.type,
    },
    emphasis: { disabled: true },
    data: run.samples.map((sample) =>
      chartPoint(sample.timeMs, metric.value(sample), logScale),
    ) as ChartPoint[],
  };
}

function markerSeries(
  palette: ChartPalette,
  run: ReducedRun,
  botIndex: number,
  type: EventType,
  typeIndex: number,
  typeStep: number,
) {
  const y = MARKER_BASE + typeIndex * typeStep + botIndex * MARKER_BOT_STEP;
  return {
    name: `${BOT_LABELS[run.bot]} · ${type}`,
    type: 'scatter' as const,
    yAxisIndex: MARKER_AXIS_INDEX,
    silent: true,
    symbol: MARKER_SYMBOLS[type],
    symbolSize: 7,
    color: palette.markers[type],
    itemStyle: { opacity: botIndex === 0 ? 0.95 : 0.6 },
    tooltip: { show: false },
    data: run.events
      .filter((event: SimEvent) => event.type === type)
      .map((event) => [event.timeMs, y]),
  };
}

export function formatTooltip(rows: readonly TooltipRow[], tab: SampleTab): string {
  const lines = rows
    .filter((row) => Array.isArray(row.value) && row.value.length === 3)
    .map((row) => {
      const value = (row.value as ChartPoint)[2];
      const marker = typeof row.marker === 'string' ? row.marker : '';
      return `${marker}${row.seriesName}: <b>${CHART_TABS[tab].formatValue(value)}</b>`;
    });
  const time = Number(rows[0]?.axisValue ?? 0);
  return [`<b>${formatElapsed(time)}</b>`, ...lines].join('<br>');
}

/** Baut die vollständige ECharts-Option eines Reiters. */
export function buildChartOption(input: ChartInput) {
  const { tab, runs, logScale, markers, zoom, palette } = input;
  const baseline = input.baseline ?? [];
  const definition = CHART_TABS[tab];
  const durationMs = runs[0]?.durationMs ?? baseline[0]?.durationMs ?? 0;

  const lines = [
    ...runs.flatMap((run) =>
      definition.metrics.map((metric, i) => lineSeries(palette, run, metric, i, logScale, false)),
    ),
    ...baseline.flatMap((run) =>
      definition.metrics.map((metric, i) => lineSeries(palette, run, metric, i, logScale, true)),
    ),
  ];
  const typeStep = Math.max(runs.length, MIN_MARKER_BOTS) * MARKER_BOT_STEP + MARKER_TYPE_GAP;
  const marks = MARKER_ORDER.filter((type) => markers.has(type)).flatMap((type) =>
    runs.map((run, botIndex) =>
      markerSeries(palette, run, botIndex, type, MARKER_ORDER.indexOf(type), typeStep),
    ),
  );
  const zoomWindow = zoom === null ? {} : { startValue: zoom.fromMs, endValue: zoom.toMs };

  return {
    animation: false,
    useUTC: true,
    legend: { type: 'scroll' as const, top: 0, data: lines.map((line) => line.name) },
    grid: { left: 76, right: 20, top: 36, bottom: 68 },
    tooltip: {
      trigger: 'axis' as const,
      confine: true,
      formatter: (rows: TooltipRow | TooltipRow[]) =>
        formatTooltip(Array.isArray(rows) ? rows : [rows], tab),
    },
    xAxis: {
      // Die Zeitachse setzt Teilstriche auf volle Stunden und Minuten; UTC zählt ab Laufbeginn.
      type: 'time' as const,
      min: 0,
      max: durationMs,
      axisLabel: { hideOverlap: true, formatter: (value: number) => formatElapsed(value) },
      splitLine: { show: false },
    },
    yAxis: [
      {
        type: logScale ? ('log' as const) : ('value' as const),
        axisLabel: { formatter: (value: number) => definition.formatAxis(value) },
      },
      { type: 'value' as const, min: 0, max: 1, show: false },
    ],
    dataZoom: [
      { type: 'inside' as const, xAxisIndex: 0, filterMode: 'weakFilter' as const, ...zoomWindow },
      {
        type: 'slider' as const,
        xAxisIndex: 0,
        filterMode: 'weakFilter' as const,
        bottom: 8,
        height: 24,
        labelFormatter: (value: number) => formatElapsed(value),
        textStyle: { color: palette.muted },
        ...zoomWindow,
      },
    ],
    series: [...lines, ...marks],
  };
}

export type ChartOption = ReturnType<typeof buildChartOption>;
