import { formatNum, formatRate } from '../../core/num/format';
import type { SimEvent, SimSample } from '../../core/sim/runner';
import { formatAxisValue, formatElapsed } from '../model-format';
import { BOT_LABELS, MODEL_TEXTS, SERIES_LABELS } from '../model-texts.de';
import type { EventType, ReducedRun } from '../sim/reduce-result';
import type { TimeRange } from '../wait-share';
import { CHART_COLORS, MARKER_COLORS, SERIES_COLORS } from './chart-theme';

export type ChartTab = 'resources' | 'rates' | 'decisions';

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
  value === null ? MODEL_TEXTS.noValue : format(value);

function formatWait(value: number | null): string {
  if (value === null) {
    return MODEL_TEXTS.never;
  }
  return value === 0 ? MODEL_TEXTS.soon : formatElapsed(value);
}

export const CHART_TABS: Readonly<Record<ChartTab, TabDefinition>> = {
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
  newSite: 'circle',
};
const MARKER_ORDER: readonly EventType[] = ['buy', 'siteEmpty', 'newSite'];
/** Lage der Markierungen auf der verdeckten 0–1-Achse, unabhängig von der Wertachse. */
const MARKER_BASE = 0.03;
const MARKER_TYPE_STEP = 0.05;
const MARKER_BOT_STEP = 0.02;
const MARKER_AXIS_INDEX = 1;

const BASELINE_DASH = [6, 4];

export interface ChartInput {
  readonly tab: ChartTab;
  readonly runs: readonly ReducedRun[];
  readonly baseline: readonly ReducedRun[] | null;
  readonly logScale: boolean;
  readonly markers: ReadonlySet<EventType>;
  readonly zoom: TimeRange | null;
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
  run: ReducedRun,
  metric: Metric,
  colorIndex: number,
  logScale: boolean,
  isBaseline: boolean,
) {
  const bot = BOT_LABELS[run.bot];
  const prefix = isBaseline ? `${MODEL_TEXTS.baselinePrefix} ${bot}` : bot;
  const isIdle = run.bot === 'idle';
  return {
    name: `${prefix} · ${metric.label}`,
    type: 'line' as const,
    showSymbol: false,
    connectNulls: false,
    color: SERIES_COLORS[colorIndex % SERIES_COLORS.length],
    lineStyle: {
      width: isIdle ? 1.25 : 2,
      opacity: (isIdle ? 0.7 : 1) * (isBaseline ? 0.7 : 1),
      type: isBaseline ? BASELINE_DASH : ('solid' as const),
    },
    emphasis: { disabled: true },
    data: run.samples.map((sample) =>
      chartPoint(sample.timeMs, metric.value(sample), logScale),
    ) as ChartPoint[],
  };
}

function markerSeries(run: ReducedRun, botIndex: number, type: EventType, typeIndex: number) {
  const y = MARKER_BASE + typeIndex * MARKER_TYPE_STEP + botIndex * MARKER_BOT_STEP;
  return {
    name: `${BOT_LABELS[run.bot]} · ${type}`,
    type: 'scatter' as const,
    yAxisIndex: MARKER_AXIS_INDEX,
    silent: true,
    symbol: MARKER_SYMBOLS[type],
    symbolSize: 7,
    color: MARKER_COLORS[type],
    itemStyle: { opacity: botIndex === 0 ? 0.95 : 0.6 },
    tooltip: { show: false },
    data: run.events
      .filter((event: SimEvent) => event.type === type)
      .map((event) => [event.timeMs, y]),
  };
}

export function formatTooltip(rows: readonly TooltipRow[], tab: ChartTab): string {
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
  const { tab, runs, logScale, markers, zoom } = input;
  const baseline = input.baseline ?? [];
  const definition = CHART_TABS[tab];
  const durationMs = runs[0]?.durationMs ?? baseline[0]?.durationMs ?? 0;

  const lines = [
    ...runs.flatMap((run) =>
      definition.metrics.map((metric, i) => lineSeries(run, metric, i, logScale, false)),
    ),
    ...baseline.flatMap((run) =>
      definition.metrics.map((metric, i) => lineSeries(run, metric, i, logScale, true)),
    ),
  ];
  const marks = MARKER_ORDER.filter((type) => markers.has(type)).flatMap((type) =>
    runs.map((run, botIndex) => markerSeries(run, botIndex, type, MARKER_ORDER.indexOf(type))),
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
        textStyle: { color: CHART_COLORS.muted },
        ...zoomWindow,
      },
    ],
    series: [...lines, ...marks],
  };
}

export type ChartOption = ReturnType<typeof buildChartOption>;
