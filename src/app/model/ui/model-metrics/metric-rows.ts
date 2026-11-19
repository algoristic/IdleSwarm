import type { FindKind } from '@app/finds/domain/models/finds.model';
import { FIND_KINDS } from '@app/finds/domain/models/finds.model';
import {
  formatComputeTime,
  formatElapsed,
  formatShare,
} from '@app/shared/util/format/elapsed-format';
import { formatNum } from '@app/shared/util/format/format';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import { dnaSinkExhaustedMs } from '../../domain/dna-flow-logic';
import { genomeCostTotal, longestUnlockGap } from '../../domain/progress-logic';
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
  dnaFromCombat: $localize`:@@uiModel-metricRows-dnaFromCombat:DNA aus Kampf`,
  dnaFromFinds: $localize`:@@uiModel-metricRows-dnaFromFinds:DNA aus Funden`,
  firstGland: $localize`:@@uiModel-metricRows-firstGland:Erster Drüsenpunkt`,
  firstMove: $localize`:@@uiModel-metricRows-firstMove:Erster Weiterzug`,
  firstFind: $localize`:@@uiModel-metricRows-firstFind:Erster Fund`,
  firstAdaptation: $localize`:@@uiModel-metricRows-firstAdaptation:Erste Adaption`,
  firstCombatCapture: $localize`:@@uiModel-metricRows-firstCombatCapture:Erste Einnahme mit Kampf`,
  nodesAtCheckpoint: $localize`:@@uiModel-metricRows-nodesAtCheckpoint:Genom-Knoten nach 1 h`,
  nodesAtEnd: $localize`:@@uiModel-metricRows-nodesAtEnd:Genom-Knoten am Laufende`,
  genomeComplete: $localize`:@@uiModel-metricRows-genomeComplete:Genom komplett`,
  findCount: $localize`:@@uiModel-metricRows-findCount:Funde Anzahl`,
  findsByKind: $localize`:@@uiModel-metricRows-findsByKind:Funde je Art`,
  uniqueCount: $localize`:@@uiModel-metricRows-uniqueCount:Einzigartige Adaptionen`,
  badgeCount: $localize`:@@uiModel-metricRows-badgeCount:Badges`,
  glandCount: $localize`:@@uiModel-metricRows-glandCount:Drüsenpunkte gekauft`,
  dnaSinkExhausted: $localize`:@@uiModel-metricRows-dnaSinkExhausted:DNA-Einnahmen über Genomkosten ab (Abtastpunkte)`,
  unlockGap: $localize`:@@uiModel-metricRows-unlockGap:Größter Abstand neuer Optionen (erste 60 min)`,
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

const FIND_KIND_LABELS: Readonly<Record<FindKind, string>> = {
  dna: $localize`:@@uiModel-metricRows-findKind-dna:DNA`,
  food: $localize`:@@uiModel-metricRows-findKind-food:Nahrung`,
  buff: $localize`:@@uiModel-metricRows-findKind-buff:Buff`,
  fragment: $localize`:@@uiModel-metricRows-findKind-fragment:Fragment`,
  collectible: $localize`:@@uiModel-metricRows-findKind-collectible:Sammelobjekt`,
};

/** Größter Abstand neuer Optionen (Game-Design §6.3) über die erste Stunde bzw. bis Laufende. */
function unlockGapMs(run: ReducedRun): number | null {
  const gap = longestUnlockGap(run.progress.unlocks, MS_PER_HOUR, run.durationMs);
  return gap === null ? null : gap.toMs - gap.fromMs;
}

function findsByKind(run: ReducedRun): string {
  const { findsByKind: counts } = run.progress;
  const parts = FIND_KINDS.filter((kind) => counts[kind] > 0).map(
    (kind) => `${FIND_KIND_LABELS[kind]} ${formatNum(counts[kind])}`,
  );
  return parts.length === 0 ? T.noValue : parts.join(' · ');
}

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
    row(T.dnaTotal, ({ progress }) => formatNum(progress.dnaFromCombat + progress.dnaFromFinds)),
    row(T.dnaFromCombat, ({ progress }) => formatNum(progress.dnaFromCombat)),
    row(T.dnaFromFinds, ({ progress }) => formatNum(progress.dnaFromFinds)),
    row(T.longestNoCombatCapture, ({ metrics }) => formatElapsed(metrics.longestNoCombatCaptureMs)),
    row(T.longestSiteStay, ({ metrics }) => formatElapsed(metrics.longestSiteStayMs)),
    row(T.longestNoBuy, ({ metrics }) => formatElapsed(metrics.longestNoBuyMs)),
    row(T.firstGland, ({ progress }) => time(progress.firstGlandMs)),
    row(T.firstMove, ({ progress }) => time(progress.firstMoveMs)),
    row(T.firstFind, ({ progress }) => time(progress.firstFindMs)),
    row(T.firstAdaptation, ({ progress }) => time(progress.firstAdaptationMs)),
    row(T.firstCombatCapture, ({ progress }) => time(progress.firstCombatCaptureMs)),
    row(T.unlockGap, (run) => time(unlockGapMs(run))),
    row(T.nodesAtCheckpoint, ({ progress }) => formatNum(progress.nodesAtCheckpoint)),
    row(T.nodesAtEnd, ({ progress }) => formatNum(progress.nodesAtEnd)),
    row(T.genomeComplete, ({ progress }) => time(progress.genomeCompleteMs)),
    row(T.findCount, ({ progress }) => formatNum(progress.findCount)),
    row(T.findsByKind, findsByKind),
    row(T.uniqueCount, ({ progress }) => formatNum(progress.uniqueCount)),
    row(T.badgeCount, ({ progress }) => formatNum(progress.badgeCount)),
    row(T.glandCount, ({ progress }) => formatNum(progress.glandCount)),
    row(T.dnaSinkExhausted, (run) =>
      time(dnaSinkExhaustedMs(run.samples, genomeCostTotal(run.params))),
    ),
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
