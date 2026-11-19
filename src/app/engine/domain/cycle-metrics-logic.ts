import type { SiteMetric } from './runner-logic';

/** Zeitstrecke eines Laufs; `open` reicht sie bis zum Laufende, ohne dass sie dort abschließt. */
export interface TimeSpan {
  readonly fromMs: number;
  readonly toMs: number;
  readonly open: boolean;
}

/** Strecken über der Stillstandsschwelle, getrennt nach Art (US-10.06). */
export interface StallSpans {
  /** Keine Einnahme eines Ziels mit Abwehr > 0, also keine DNA. */
  readonly noCombatCapture: readonly TimeSpan[];
  /** Kein Aufbruch: der Schwarm bleibt an einer Futterstelle. */
  readonly noDeparture: readonly TimeSpan[];
}

/**
 * Strecken ohne Einnahme mit Kampf: zwischen Laufbeginn, den Ankünften an Zielen mit Abwehr > 0 und
 * dem Laufende. Algenmatten (Abwehr 0) beenden keine Strecke.
 */
export function noCombatCaptureSpans(sites: readonly SiteMetric[], durationMs: number): TimeSpan[] {
  const captures = sites.filter((site) => site.fought).map((site) => site.startMs);
  const bounds = [0, ...captures];
  return bounds.map((fromMs, index) => {
    const open = index === bounds.length - 1;
    return { fromMs, toMs: open ? durationMs : bounds[index + 1], open };
  });
}

/** Aufenthalte je Futterstelle von der Ankunft bis zum Aufbruch; ohne Aufbruch bis zum Laufende. */
export function siteStaySpans(sites: readonly SiteMetric[], durationMs: number): TimeSpan[] {
  return sites.map((site) => ({
    fromMs: site.startMs,
    toMs: site.departureMs ?? durationMs,
    open: site.departureMs === null,
  }));
}

export function spanMs(span: TimeSpan): number {
  return span.toMs - span.fromMs;
}

/** Längste Strecke; 0 ohne Strecken. */
export function longestSpanMs(spans: readonly TimeSpan[]): number {
  return spans.reduce((longest, span) => Math.max(longest, spanMs(span)), 0);
}

/** Strecken, die strikt länger als `thresholdMs` dauern. */
export function spansLongerThan(spans: readonly TimeSpan[], thresholdMs: number): TimeSpan[] {
  return spans.filter((span) => spanMs(span) > thresholdMs);
}

/** Beide Stillstandsarten mit derselben Schwelle; offene Strecken am Laufende zählen mit. */
export function stallSpans(
  sites: readonly SiteMetric[],
  durationMs: number,
  thresholdMs: number,
): StallSpans {
  return {
    noCombatCapture: spansLongerThan(noCombatCaptureSpans(sites, durationMs), thresholdMs),
    noDeparture: spansLongerThan(siteStaySpans(sites, durationMs), thresholdMs),
  };
}
