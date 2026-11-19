import type { GameState } from '@app/engine/domain/models/game-state.model';
import type { Num } from '@app/shared/util/num/num';

import type { GenomeNodeId } from './genome.model';

/**
 * Ein regulärer Knoten wurde entwickelt (Game-Design §4.14); `playedMs` ist die Spielzeit
 * (`time.played`) des Kaufs. Für das Log und die Markierungen der Modell-Seite (US-10.02).
 */
export interface EvolvedEvent {
  readonly type: 'evolved';
  readonly playedMs: number;
  readonly node: GenomeNodeId;
  /** Abgezogene DNA. */
  readonly cost: Num;
}

export type GenomeEvent = EvolvedEvent;

/** Zustand und Ereignisse eines Genom-Kommandos. */
export interface GenomeResult {
  readonly state: GameState;
  readonly events: readonly GenomeEvent[];
}
