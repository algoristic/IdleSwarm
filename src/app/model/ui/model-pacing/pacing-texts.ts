import type {
  PacingBand,
  PacingBound,
  PacingMeasureId,
  PacingTargetId,
  PacingUnit,
} from '@app/balance/domain/targets';
import { formatElapsed } from '@app/shared/util/format/elapsed-format';
import { formatNum } from '@app/shared/util/format/format';

import type { BotPacing, PacingWarning } from '../../domain/pacing-targets-logic';
import type { TimeRange } from '../../domain/wait-share-logic';

/** Kennzahlen wie im Projektplan §3.5. */
export const PACING_TARGET_LABELS: Readonly<Record<PacingTargetId, string>> = {
  firstDecision: $localize`:@@uiModel-pacingTexts-target-firstDecision:Zeit bis zur ersten sinnvollen Entscheidung`,
  buyInterval: $localize`:@@uiModel-pacingTexts-target-buyInterval:Zeit zwischen zwei sinnvollen Käufen, erste 30 min`,
  siteDuration: $localize`:@@uiModel-pacingTexts-target-siteDuration:Dauer pro Futterstelle`,
  longestDrought: $localize`:@@uiModel-pacingTexts-target-longestDrought:Längste Durststrecke ohne neue Option`,
  newMechanic: $localize`:@@uiModel-pacingTexts-target-newMechanic:Neue Mechanik/Ansicht freigeschaltet, erste Stunde`,
};

/** Gemessene Größe hinter der Kennzahl (Game-Design §6.1–6.3). */
export const PACING_MEASURE_LABELS: Readonly<Record<PacingMeasureId, string>> = {
  firstBuy: $localize`:@@uiModel-pacingTexts-measure-firstBuy:Erster Kauf`,
  buyGapMedian: $localize`:@@uiModel-pacingTexts-measure-buyGapMedian:Kauflücke Median`,
  longestWait: $localize`:@@uiModel-pacingTexts-measure-longestWait:Längste Wartezeit`,
  siteDuration: $localize`:@@uiModel-pacingTexts-measure-siteDuration:Futterstelle`,
  longestNoBuy: $localize`:@@uiModel-pacingTexts-measure-longestNoBuy:Längste Strecke ohne Kauf`,
  unlockGap: $localize`:@@uiModel-pacingTexts-measure-unlockGap:Größter Abstand neuer Optionen`,
};

const UNIT_LABELS: Readonly<Record<PacingUnit, string>> = {
  second: $localize`:@@uiModel-pacingTexts-unit-second:s`,
  minute: $localize`:@@uiModel-pacingTexts-unit-minute:min`,
};

const NEVER = $localize`:@@uiModel-pacingTexts-never:nie`;

function comparison(limit: PacingBound, lower: boolean): string {
  if (lower) {
    return limit.inclusive ? '≥' : '>';
  }
  return limit.inclusive ? '≤' : '<';
}

/** Band wie im Projektplan: „5–60 s“, „< 10 s“; mit `upperOnly` nur die Obergrenze („≤ 60 s“). */
export function formatBand(band: PacingBand, upperOnly = false): string {
  const unit = UNIT_LABELS[band.unit];
  const min = upperOnly ? null : band.min;
  const { max } = band;
  if (min !== null && max !== null) {
    return `${formatNum(min.value)}–${formatNum(max.value)} ${unit}`;
  }
  if (max !== null) {
    return `${comparison(max, false)} ${formatNum(max.value)} ${unit}`;
  }
  return min === null ? '–' : `${comparison(min, true)} ${formatNum(min.value)} ${unit}`;
}

export interface PacingWarningView {
  readonly key: string;
  readonly target: string;
  readonly measure: string;
  /** Futterstelle bei „Dauer pro Futterstelle“. */
  readonly site: number | null;
  readonly value: string;
  readonly band: string;
  readonly span: TimeRange;
}

export interface BotPacingView {
  readonly bot: BotPacing['bot'];
  readonly checked: number;
  readonly warnings: readonly PacingWarningView[];
}

function toView(warning: PacingWarning, index: number): PacingWarningView {
  return {
    key: `${warning.target}-${warning.measure}-${index}`,
    target: PACING_TARGET_LABELS[warning.target],
    measure: PACING_MEASURE_LABELS[warning.measure],
    site: warning.site,
    value: warning.valueMs === null ? NEVER : formatElapsed(warning.valueMs),
    band: formatBand(warning.band, warning.upperOnly),
    span: warning.span,
  };
}

export function pacingViews(entries: readonly BotPacing[]): BotPacingView[] {
  return entries.map((entry) => ({
    bot: entry.bot,
    checked: entry.checked,
    warnings: entry.warnings.map(toView),
  }));
}
