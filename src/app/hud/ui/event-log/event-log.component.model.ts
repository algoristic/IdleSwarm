import type { GameEvent } from '@app/engine/domain/models/game-event.model';

/**
 * Art der Darstellung (Mockup `.log`): Funde hervorgehoben (US-06.01), Verluste und
 * Zurückgelassene, DNA, Aufbruch und Ankunft je in eigener Farbe, sonst Grundfarbe.
 */
export const LOG_ITEM_KINDS = ['default', 'found', 'loss', 'dna', 'travel'] as const;

export type LogItemKind = (typeof LOG_ITEM_KINDS)[number];

/** Eintrag des Logs; `id` ist die Identität aus dem Store. */
export interface LogEntryView {
  readonly id: number;
  readonly event: GameEvent;
  readonly kind: LogItemKind;
}

export interface LogItem {
  readonly id: number;
  readonly playedMs: number;
  readonly text: string;
  readonly kind: LogItemKind;
  /** Vollständige Utility-Klassen des Texts je Art. */
  readonly textClass: string;
}
