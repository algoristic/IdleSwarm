import type { BalanceParams } from '@app/balance/domain/constants';
import type {
  SimEvent,
  SimMetrics,
  SimResult,
  SimSample,
  SiteMetric,
} from '@app/engine/domain/runner-logic';

import type { BotKind } from './models/sim.model';

/** Zielgröße der Zeitreihen; die Obergrenze fängt abweichende Abtastungen ab. */
const TARGET_SAMPLE_INTERVALS = 1440;
export const MAX_SAMPLES = 2000;
export const MAX_EVENTS_PER_TYPE = 500;

const MS_PER_SECOND = 1000;

/**
 * Ereignisarten, die das Ergebnis behält und die Diagramme markieren. `departed` fällt weg: Beim
 * Auto-Weiterziehen mit Schwelle 0 fällt es mit `siteEmpty` zusammen, und `arrived` zeigt den Zug.
 */
export const EVENT_TYPES = [
  'buy',
  'siteEmpty',
  'arrived',
] as const satisfies readonly SimEvent['type'][];
export type EventType = (typeof EVENT_TYPES)[number];

export interface SiteSummary {
  readonly count: number;
  readonly first: SiteMetric | null;
  readonly last: SiteMetric | null;
  /** Median der abgeschlossenen Futterstellen. */
  readonly medianDurationMs: number | null;
}

export type ReducedMetrics = Omit<SimMetrics, 'sites'> & { readonly sites: SiteSummary };

/** Für `postMessage` verkleinertes Ergebnis eines Bot-Laufs. */
export interface ReducedRun {
  readonly bot: BotKind;
  readonly seed: string;
  readonly durationMs: number;
  readonly sampleEveryMs: number;
  readonly params: BalanceParams;
  readonly saturated: boolean;
  readonly computeMs: number;
  readonly samples: readonly SimSample[];
  readonly events: readonly SimEvent[];
  /** Ereignisse je Art vor dem Ausdünnen. */
  readonly eventTotals: Readonly<Record<EventType, number>>;
  readonly metrics: ReducedMetrics;
}

/**
 * Abstand in ganzen Sekunden: Die Abtastung fällt so auf Schrittgrenzen und ändert den Lauf nicht.
 * Runde Werte wie 10 min würden mit dem Besuchstakt des Idle-Bots zusammenfallen und nur Zustände
 * direkt nach seinen Käufen zeigen.
 */
export function sampleEveryFor(durationMs: number): number {
  const seconds = Math.ceil(durationMs / TARGET_SAMPLE_INTERVALS / MS_PER_SECOND);
  return Math.max(seconds, 1) * MS_PER_SECOND;
}

/** Gleichmäßige Auswahl, die erstes und letztes Element behält. */
export function thinEvenly<T>(items: readonly T[], max: number): readonly T[] {
  if (items.length <= max) {
    return items;
  }
  if (max <= 1) {
    return items.slice(0, Math.max(max, 0));
  }
  const last = items.length - 1;
  return Array.from({ length: max }, (_, i) => items[Math.round((i * last) / (max - 1))]);
}

export function summarizeSites(sites: readonly SiteMetric[]): SiteSummary {
  const durations = sites
    .map((site) => site.durationMs)
    .filter((duration) => duration !== null)
    .sort((a, b) => a - b);
  const middle = Math.floor(durations.length / 2);
  let medianDurationMs: number | null = null;
  if (durations.length > 0) {
    medianDurationMs =
      durations.length % 2 === 1
        ? durations[middle]
        : (durations[middle - 1] + durations[middle]) / 2;
  }
  return {
    count: sites.length,
    first: sites[0] ?? null,
    last: sites[sites.length - 1] ?? null,
    medianDurationMs,
  };
}

/** Verkleinert ein Ergebnis vor dem Senden; ein Aktiv-Lauf über 24 h hätte roh rund 12,7 MB. */
export function reduceResult(result: SimResult, bot: BotKind, computeMs: number): ReducedRun {
  const byType = new Map<SimEvent['type'], SimEvent[]>(EVENT_TYPES.map((type) => [type, []]));
  for (const event of result.events) {
    byType.get(event.type)?.push(event);
  }
  const count = (type: EventType): number => byType.get(type)?.length ?? 0;
  const events = EVENT_TYPES.flatMap((type) =>
    thinEvenly(byType.get(type) ?? [], MAX_EVENTS_PER_TYPE),
  );
  return {
    bot,
    seed: result.seed,
    durationMs: result.durationMs,
    sampleEveryMs: result.sampleEveryMs,
    params: result.params,
    saturated: result.saturated,
    computeMs,
    samples: thinEvenly(result.samples, MAX_SAMPLES),
    events,
    eventTotals: {
      buy: count('buy'),
      siteEmpty: count('siteEmpty'),
      arrived: count('arrived'),
    },
    metrics: { ...result.metrics, sites: summarizeSites(result.metrics.sites) },
  };
}
