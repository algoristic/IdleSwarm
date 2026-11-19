import {
  formatComputeTime,
  formatElapsed,
  formatShare,
} from '@app/shared/util/format/elapsed-format';
import { formatNum } from '@app/shared/util/format/format';

import type { ReducedRun } from '../../domain/reduce-result-logic';
import { TimeRange, waitShareInRange } from '../../domain/wait-share-logic';

const T = {
  noValue: '–',
  saturatedNo: $localize`:@@uiModel-metricRows-saturated-no:nein`,
  saturatedYes: $localize`:@@uiModel-metricRows-saturated-yes:ja`,
  firstBuy: $localize`:@@uiModel-metricRows-firstBuy:Erster Kauf`,
  gapMedian: $localize`:@@uiModel-metricRows-gapMedian:Kauflücke Median (erste 30 min)`,
  gapMax: $localize`:@@uiModel-metricRows-gapMax:Kauflücke Maximum (erste 30 min)`,
  gapCount: $localize`:@@uiModel-metricRows-gapCount:Kauflücken Anzahl (erste 30 min)`,
  longestWait: $localize`:@@uiModel-metricRows-longestWait:Längste Wartezeit (erste 30 min)`,
  firstSite: $localize`:@@uiModel-metricRows-firstSite:Erste Futterstelle`,
  siteCount: $localize`:@@uiModel-metricRows-siteCount:Futterstellen Anzahl`,
  siteMedian: $localize`:@@uiModel-metricRows-siteMedian:Futterstelle Median`,
  siteMedianTravel: $localize`:@@uiModel-metricRows-siteMedianTravel:Reisezeit Median`,
  fightCount: $localize`:@@uiModel-metricRows-fightCount:Einnahmen mit Kampf`,
  dnaTotal: $localize`:@@uiModel-metricRows-dnaTotal:DNA gesamt`,
  longestNoCombatCapture: $localize`:@@uiModel-metricRows-longestNoCombatCapture:Längste Strecke ohne Kampfziel`,
  longestSiteStay: $localize`:@@uiModel-metricRows-longestSiteStay:Längster Aufenthalt an einer Futterstelle`,
  longestNoBuy: $localize`:@@uiModel-metricRows-longestNoBuy:Längste Strecke ohne Kauf`,
  doubling: $localize`:@@uiModel-metricRows-doubling:Verdopplungszeit Nahrung/s (Median)`,
  doublingLast: $localize`:@@uiModel-metricRows-doublingLast:Letzte Verdopplung`,
  waitRange: $localize`:@@uiModel-metricRows-waitRange:Anteil Wartezeit im Ausschnitt (Abtastpunkte)`,
  waitExact: $localize`:@@uiModel-metricRows-waitExact:Anteil Wartezeit ganzer Lauf (exakt)`,
  computeTime: $localize`:@@uiModel-metricRows-computeTime:Rechendauer`,
  buyTotal: $localize`:@@uiModel-metricRows-buyTotal:Käufe gesamt`,
  saturated: $localize`:@@uiModel-metricRows-saturated:Werte am Zahlenbereich begrenzt`,
} as const;

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
    row(T.siteMedianTravel, ({ metrics }) => time(metrics.sites.medianTravelMs)),
    row(T.fightCount, ({ metrics }) => formatNum(metrics.sites.fightCount)),
    row(T.dnaTotal, ({ metrics }) => formatNum(metrics.sites.dnaTotal)),
    row(T.longestNoCombatCapture, ({ metrics }) => formatElapsed(metrics.longestNoCombatCaptureMs)),
    row(T.longestSiteStay, ({ metrics }) => formatElapsed(metrics.longestSiteStayMs)),
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
