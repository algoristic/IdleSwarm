import {
  isWithinBand,
  PACING_BOTS,
  PacingBand,
  PacingBot,
  PacingCheck,
  PacingMeasureId,
  PacingTarget,
  PacingTargetId,
  pacingTargetsFor,
  pacingWindowMs,
} from '@app/balance/domain/targets';
import { BUY_GAP_WINDOW_MS } from '@app/engine/domain/runner-logic';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import type { BotKind } from './models/sim.model';
import { longestUnlockGap } from './progress-logic';
import type { ReducedRun } from './reduce-result-logic';
import type { TimeRange } from './wait-share-logic';

/** Die Bot-Arten der Zielbänder sind Bot-Arten der Modell-Seite. */
const PACING_BOT_KINDS: readonly BotKind[] = PACING_BOTS;

/** Fenster ohne eigene Angabe beim Abstand neuer Optionen: die erste Stunde (Projektplan §3.5). */
const DEFAULT_UNLOCK_WINDOW_MS = MS_PER_HOUR;

/** Eine gemessene Größe; `value` `null` heißt „nicht eingetreten“ (z. B. nie gekauft). */
export interface PacingMeasurement {
  readonly measure: PacingMeasureId;
  readonly valueMs: number | null;
  /** Zeitraum, auf den sich der Wert bezieht. */
  readonly span: TimeRange;
  /** Futterstelle bei `siteDuration`, sonst `null`. */
  readonly site: number | null;
}

/** Abweichung vom Zielband (US-10.08). */
export interface PacingWarning extends PacingMeasurement {
  readonly target: PacingTargetId;
  readonly band: PacingBand;
  /** Nur die Obergrenze bewertet (siehe `PacingCheck.upperOnly`). */
  readonly upperOnly: boolean;
}

export interface BotPacing {
  readonly bot: PacingBot;
  /** Zahl der bewerteten Messungen, auch der im Band. */
  readonly checked: number;
  /** Zeitlich geordnet, bei gleicher Zeit in der Reihenfolge der Zielbänder. */
  readonly warnings: readonly PacingWarning[];
}

export function isPacingBot(bot: BotKind): bot is PacingBot {
  return PACING_BOT_KINDS.includes(bot);
}

function windowEnd(target: PacingTarget, fallbackMs: number, durationMs: number): number {
  const windowMs = target.window === null ? fallbackMs : pacingWindowMs(target.window);
  return Math.min(windowMs, durationMs);
}

/** Messungen einer Größe aus dem verkleinerten Ergebnis (Mess-Definitionen Game-Design §6.1/6.2). */
export function measure(
  run: ReducedRun,
  check: PacingCheck,
  target: PacingTarget,
): PacingMeasurement[] {
  const { metrics, durationMs } = run;
  const single = (valueMs: number | null, span: TimeRange): PacingMeasurement[] => [
    { measure: check.measure, valueMs, span, site: null },
  ];
  switch (check.measure) {
    case 'firstBuy':
      return single(metrics.firstBuyMs, { fromMs: 0, toMs: metrics.firstBuyMs ?? durationMs });
    case 'buyGapMedian':
      return single(metrics.buyGaps.medianMs, {
        fromMs: 0,
        toMs: windowEnd(target, BUY_GAP_WINDOW_MS, durationMs),
      });
    case 'longestWait': {
      const fromMs = metrics.longestWaitFromMs ?? 0;
      return single(metrics.longestWaitMs, { fromMs, toMs: fromMs + metrics.longestWaitMs });
    }
    case 'siteDuration':
      // Nur abgeschlossene Futterstellen, wie „Futterstellen im Zielband“ in Game-Design §6.1.
      return metrics.siteList.flatMap((site) =>
        site.durationMs === null || site.departureMs === null
          ? []
          : [
              {
                measure: check.measure,
                valueMs: site.durationMs,
                span: { fromMs: site.startMs, toMs: site.departureMs },
                site: site.index,
              },
            ],
      );
    case 'longestNoBuy': {
      const fromMs = metrics.longestNoBuyFromMs;
      return single(metrics.longestNoBuyMs, { fromMs, toMs: fromMs + metrics.longestNoBuyMs });
    }
    case 'unlockGap': {
      const endMs = windowEnd(target, DEFAULT_UNLOCK_WINDOW_MS, durationMs);
      const gap = longestUnlockGap(run.progress.unlocks, endMs, durationMs);
      return gap === null ? [] : single(gap.toMs - gap.fromMs, gap);
    }
  }
}

/** Bewertet einen Lauf gegen seine Zielbänder; Bots ohne Zielband liefern `null`. */
export function botPacing(run: ReducedRun): BotPacing | null {
  const { bot } = run;
  if (!isPacingBot(bot)) {
    return null;
  }
  let checked = 0;
  const warnings: PacingWarning[] = [];
  for (const target of pacingTargetsFor(bot)) {
    for (const check of target.checks) {
      for (const measurement of measure(run, check, target)) {
        checked++;
        const { valueMs } = measurement;
        if (valueMs === null || !isWithinBand(valueMs, target.band, check.upperOnly)) {
          warnings.push({
            ...measurement,
            target: target.id,
            band: target.band,
            upperOnly: check.upperOnly ?? false,
          });
        }
      }
    }
  }
  // `sort` ist stabil; gleiche Zeiten bleiben in der Reihenfolge der Zielbänder.
  warnings.sort((a, b) => a.span.fromMs - b.span.fromMs);
  return { bot, checked, warnings };
}

/** Warnlisten der Bots mit Zielband (Aktiv, Idle), in der Reihenfolge der Läufe. */
export function pacingWarnings(runs: readonly ReducedRun[]): BotPacing[] {
  return runs.map(botPacing).filter((entry) => entry !== null);
}
