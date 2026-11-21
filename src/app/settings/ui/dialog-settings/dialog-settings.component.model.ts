import type { SaveErrorCode } from '@app/persistence/domain/serialize-logic';

import type { Settings } from '../../domain/models/settings.model';

/**
 * Ansichten im Dialog „Einstellungen“: Übersicht, Export, Import mit Bestätigung, Zurücksetzen in
 * zwei Schritten (US-07.05).
 */
export const SETTINGS_PANELS = [
  'main',
  'export',
  'import',
  'import-confirm',
  'reset',
  'reset-confirm',
] as const;
export type SettingsPanel = (typeof SETTINGS_PANELS)[number];

/** Rückmeldung in der Übersicht. */
export type SettingsNotice = 'imported' | 'hints-reset';

export type CopyStatus = 'copied' | 'failed';

/** Einstellungen und Angaben zum Build. */
export interface SettingsView {
  readonly settings: Settings;
  readonly version: string;
  /** `null` ohne Build-Zeitpunkt (Dev-Server). */
  readonly buildTime: number | null;
}

/** Zustand des Dialogs; nur Oberfläche, nicht im Spielstand. */
export interface SettingsDialogView {
  readonly panel: SettingsPanel;
  /** Export-Text; `null`, wenn der Stand sich nicht exportieren ließ. */
  readonly exportText: string | null;
  readonly copyStatus: CopyStatus | null;
  /** Zuletzt eingefügter Import-Text, damit er nach der Bestätigung oder einem Fehler bleibt. */
  readonly importText: string;
  readonly importError: SaveErrorCode | null;
  readonly notice: SettingsNotice | null;
}
