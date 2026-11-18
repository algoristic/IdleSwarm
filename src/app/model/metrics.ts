import { formatNum } from '../core/num/format';
import { formatComputeTime, formatElapsed, formatShare } from './model-format';
import { MODEL_TEXTS as T } from './model-texts.de';
import type { ReducedRun } from './sim/reduce-result';
import { TimeRange, waitShareInRange } from './wait-share';

export interface MetricRow {
  readonly label: string;
  readonly values: readonly string[];
}

function orDash<V>(value: V | null, format: (value: V) => string): string {
  return value === null ? T.noValue : format(value);
}

const time = (ms: number | null): string => orDash(ms, formatElapsed);

/** Kennzahlen je Bot; der Wartezeit-Anteil folgt dem Ausschnitt, ohne ihn gilt der ganze Lauf. */
export function metricRows(runs: readonly ReducedRun[], range: TimeRange | null): MetricRow[] {
  const row = (label: string, value: (run: ReducedRun) => string): MetricRow => ({
    label,
    values: runs.map(value),
  });
  return [
    row(T.firstBuy, ({ metrics }) => time(metrics.firstBuyMs)),
    row(T.gapMedian, ({ metrics }) => time(metrics.buyGaps.medianMs)),
    row(T.gapMax, ({ metrics }) => time(metrics.buyGaps.maxMs)),
    row(T.gapCount, ({ metrics }) => formatNum(metrics.buyGaps.count)),
    row(T.longestWait, ({ metrics }) => formatElapsed(metrics.longestWaitMs)),
    row(T.firstSite, ({ metrics }) => time(metrics.firstSiteMs)),
    row(T.siteCount, ({ metrics }) => formatNum(metrics.sites.count)),
    row(T.siteMedian, ({ metrics }) => time(metrics.sites.medianDurationMs)),
    row(T.longestNoBuy, ({ metrics }) => formatElapsed(metrics.longestNoBuyMs)),
    row(T.doubling, ({ metrics }) => time(metrics.foodRateDoubling.medianMs)),
    row(T.doublingLast, ({ metrics }) => time(metrics.foodRateDoubling.lastMs)),
    row(T.waitRange, (run) =>
      orDash(
        waitShareInRange(run.samples, range ?? { fromMs: 0, toMs: run.durationMs }),
        formatShare,
      ),
    ),
    row(T.waitExact, ({ metrics }) => formatShare(metrics.waitShare)),
    row(T.buyTotal, ({ eventTotals }) => formatNum(eventTotals.buy)),
    row(T.computeTime, ({ computeMs }) => formatComputeTime(computeMs)),
    row(T.saturated, ({ saturated }) => (saturated ? T.saturatedYes : T.saturatedNo)),
  ];
}
