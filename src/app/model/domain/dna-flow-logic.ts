import type { SimSample } from '@app/engine/domain/runner-logic';

/**
 * DNA-Fluss eines Abtastpunkts (US-10.07): kumulierte Einnahmen aus Kampf und Funden gegen die
 * kumulierten Ausgaben für das Genom und die Kosten der noch nicht entwickelten Knoten.
 */
export interface DnaFlowPoint {
  readonly timeMs: number;
  readonly dna: number;
  readonly fromCombat: number;
  readonly fromFinds: number;
  readonly income: number;
  readonly spent: number;
  /** Verfügbare Ausgaben: Kosten des noch nicht entwickelten Genoms, nie negativ. */
  readonly openGenomeCost: number;
}

/** `genomeCost` ist die Summe aller Knotenkosten (`genomeCostTotal`). */
export function dnaFlowPoint(sample: SimSample, genomeCost: number): DnaFlowPoint {
  const { timeMs, dna, dnaFromCombat, dnaFromFinds, dnaSpent } = sample;
  return {
    timeMs,
    dna,
    fromCombat: dnaFromCombat,
    fromFinds: dnaFromFinds,
    income: dnaFromCombat + dnaFromFinds,
    spent: dnaSpent,
    openGenomeCost: Math.max(0, genomeCost - dnaSpent),
  };
}

export function dnaFlow(samples: readonly SimSample[], genomeCost: number): DnaFlowPoint[] {
  return samples.map((sample) => dnaFlowPoint(sample, genomeCost));
}

/**
 * Erster Abtastpunkt, ab dem die Einnahmen die gesamten Genomkosten übersteigen: ab dort fehlt eine
 * DNA-Senke. `null`, solange das nicht eintritt.
 */
export function dnaSinkExhaustedMs(
  samples: readonly SimSample[],
  genomeCost: number,
): number | null {
  const point = samples.find((sample) => sample.dnaFromCombat + sample.dnaFromFinds > genomeCost);
  return point?.timeMs ?? null;
}
