import type { GameEvent } from '@app/engine/domain/models/game-event.model';

/** Eintrag des Logs; `id` ist die Identität aus dem Store. */
export interface LogEntryView {
  readonly id: number;
  readonly event: GameEvent;
}

/** Art der Darstellung: Funde werden hervorgehoben (US-06.01). */
export const LOG_ITEM_KINDS = ['default', 'found'] as const;

export type LogItemKind = (typeof LOG_ITEM_KINDS)[number];

export interface LogItem {
  readonly id: number;
  readonly playedMs: number;
  readonly text: string;
  readonly kind: LogItemKind;
  /** Vollständige Utility-Klassen des Texts je Art. */
  readonly textClass: string;
}
