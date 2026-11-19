import type { GameEvent } from '../../domain/models/game-event.model';

/** Eintrag im Ereignis-Log; `id` zählt je Store fortlaufend hoch und dient als Identität. */
export interface LogEntry {
  readonly id: number;
  readonly event: GameEvent;
}
