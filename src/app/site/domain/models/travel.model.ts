import type { SiteCandidate } from './map.model';

/** Laufende Reise; im Zustand steht `null`, solange der Schwarm nicht unterwegs ist. */
export interface Travel {
  readonly target: SiteCandidate;
  /** Restdauer in Spielzeit-Millisekunden. */
  readonly remainingMs: number;
}
