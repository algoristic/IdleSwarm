import type { GenomeEvent } from '@app/genome/domain/models/genome-event.model';
import type { SiteEvent } from '@app/site/domain/models/site-event.model';

import type { GameState } from './game-state.model';

/** Ereignisse fürs Log: Codes mit IDs und Rohwerten, die Texte setzt die Oberfläche. */
export type GameEvent = SiteEvent | GenomeEvent;

export type GameEventType = GameEvent['type'];

/** Ergebnis von Schritt oder Kommando; die Ereignisse stehen in zeitlicher Reihenfolge. */
export interface StepResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}
