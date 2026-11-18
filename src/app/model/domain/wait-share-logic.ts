import type { SimSample } from '@app/engine/domain/runner-logic';

export interface TimeRange {
  readonly fromMs: number;
  readonly toMs: number;
}

/**
 * Wartezeit-Anteil (0–1) im Zeitraum, aus den Abtastpunkten: Ein Punkt gilt bis zum nächsten und
 * zählt als Warten, wenn weder Königin noch Drohne sofort bezahlbar ist. `null` ohne Überdeckung.
 */
export function waitShareInRange(
  samples: readonly SimSample[],
  { fromMs, toMs }: TimeRange,
): number | null {
  let covered = 0;
  let waiting = 0;
  for (let i = 0; i + 1 < samples.length; i++) {
    const overlap = Math.min(samples[i + 1].timeMs, toMs) - Math.max(samples[i].timeMs, fromMs);
    if (overlap > 0) {
      covered += overlap;
      if (samples[i].nextBuyMs.total !== 0) {
        waiting += overlap;
      }
    }
  }
  return covered > 0 ? waiting / covered : null;
}
