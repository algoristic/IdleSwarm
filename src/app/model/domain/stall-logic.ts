import { spanMs, stallSpans, TimeSpan } from '@app/engine/domain/cycle-metrics-logic';
import { parseWholeNumber } from '@app/shared/util/parse/parse';
import { MS_PER_MINUTE } from '@app/shared/util/time/time-units';

import type { BotStalls, Stall, StallKind, StallThresholdValue } from './models/stall.model';
import type { ReducedRun } from './reduce-result-logic';

/** Analyse-Parameter der Modell-Seite, keine Spielkonstante (US-10.06). */
export const DEFAULT_STALL_THRESHOLD_MINUTES = 60;

const MIN_THRESHOLD = { min: 1 };

export function defaultStallThreshold(): StallThresholdValue {
  return { minutes: String(DEFAULT_STALL_THRESHOLD_MINUTES) };
}

/** Ganze Minuten ab 1, deutsch geschrieben (`1.000`); `null` bei ungültiger Eingabe. */
export function parseStallThresholdMinutes(text: string): number | null {
  return parseWholeNumber(text, MIN_THRESHOLD);
}

export function stallThresholdMs(value: StallThresholdValue): number | null {
  const minutes = parseStallThresholdMinutes(value.minutes);
  return minutes === null ? null : minutes * MS_PER_MINUTE;
}

function toStall(kind: StallKind, span: TimeSpan): Stall {
  return { kind, fromMs: span.fromMs, toMs: span.toMs, durationMs: spanMs(span), open: span.open };
}

/** Stillstände je Bot, zeitlich geordnet; wirkt ohne neuen Lauf, nur auf dem Ergebnis. */
export function botStalls(runs: readonly ReducedRun[], thresholdMs: number): BotStalls[] {
  return runs.map((run) => {
    const spans = stallSpans(run.metrics.siteList, run.durationMs, thresholdMs);
    const stalls = [
      ...spans.noCombatCapture.map((span) => toStall('noCombatCapture', span)),
      ...spans.noDeparture.map((span) => toStall('noDeparture', span)),
    ].sort((a, b) => a.fromMs - b.fromMs);
    return {
      bot: run.bot,
      stalls,
      approximate: run.metrics.siteList.length < run.metrics.sites.count,
    };
  });
}
