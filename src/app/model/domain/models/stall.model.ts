import type { BotKind } from './sim.model';

export const STALL_KINDS = ['noCombatCapture', 'noDeparture'] as const;
export type StallKind = (typeof STALL_KINDS)[number];

/** Strecke über der Stillstandsschwelle; `open` reicht bis zum Laufende. */
export interface Stall {
  readonly kind: StallKind;
  readonly fromMs: number;
  readonly toMs: number;
  readonly durationMs: number;
  readonly open: boolean;
}

export interface BotStalls {
  readonly bot: BotKind;
  readonly stalls: readonly Stall[];
  /** Die Futterstellen-Liste war ausgedünnt; die Strecken sind dann nur Näherungen. */
  readonly approximate: boolean;
}

/** Eingabe der Stillstandsschwelle, so wie das Control sie bearbeitet. */
export interface StallThresholdValue {
  readonly minutes: string;
}
