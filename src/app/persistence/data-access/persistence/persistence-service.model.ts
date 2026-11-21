import type { SaveErrorCode } from '../../domain/serialize-logic';

/** Hinweis nach dem Laden; die Oberfläche bildet ihn auf einen Text ab. */
export type RestoreNotice = 'restored-from-backup' | 'save-unreadable';

/** Ergebnis eines Exports; ein Fehler kommt als Code. */
export type ExportResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly error: SaveErrorCode };

/** Ergebnis eines Imports: übernommen oder der Code, warum der Text abgelehnt wurde. */
export type ImportOutcome = 'imported' | SaveErrorCode;
