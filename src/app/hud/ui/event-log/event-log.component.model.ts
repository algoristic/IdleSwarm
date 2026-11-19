import type { GameEvent } from '@app/engine/domain/models/game-event.model';

/** Eintrag des Logs; `id` ist die Identität aus dem Store. */
export interface LogEntryView {
  readonly id: number;
  readonly event: GameEvent;
}

export interface LogItem {
  readonly id: number;
  readonly playedMs: number;
  readonly text: string;
}
