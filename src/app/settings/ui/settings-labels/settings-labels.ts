import type { SaveErrorCode } from '@app/persistence/domain/serialize-logic';
import { MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';

import type {
  AutosaveIntervalMs,
  MotionSetting,
  NumberFormat,
} from '../../domain/models/settings.model';

export const NUMBER_FORMAT_LABELS: Readonly<Record<NumberFormat, string>> = {
  short: $localize`:@@uiSettings-settingsLabels-numberFormat-short:Kurzformen`,
  scientific: $localize`:@@uiSettings-settingsLabels-numberFormat-scientific:Wissenschaftlich`,
  engineering: $localize`:@@uiSettings-settingsLabels-numberFormat-engineering:Technisch`,
};

export const MOTION_SETTING_LABELS: Readonly<Record<MotionSetting, string>> = {
  system: $localize`:@@uiSettings-settingsLabels-motion-system:Wie im System`,
  full: $localize`:@@uiSettings-settingsLabels-motion-full:Alle`,
  reduced: $localize`:@@uiSettings-settingsLabels-motion-reduced:Reduziert`,
};

/** Schlüssel sind die Werte aus `AUTOSAVE_INTERVALS_MS`. */
export const AUTOSAVE_INTERVAL_LABELS: Readonly<Record<AutosaveIntervalMs, string>> = {
  [10 * MS_PER_SECOND]: $localize`:@@uiSettings-settingsLabels-autosave-10s:10 s`,
  [30 * MS_PER_SECOND]: $localize`:@@uiSettings-settingsLabels-autosave-30s:30 s`,
  [MS_PER_MINUTE]: $localize`:@@uiSettings-settingsLabels-autosave-60s:60 s`,
  [5 * MS_PER_MINUTE]: $localize`:@@uiSettings-settingsLabels-autosave-5min:5 min`,
};

/** Warum ein Import abgelehnt wurde (US-07.04). */
export const IMPORT_ERROR_TEXTS: Readonly<Record<SaveErrorCode, string>> = {
  corrupt: $localize`:@@uiSettings-settingsLabels-importError-corrupt:Der Text ist kein gültiger Spielstand. Wurde er vollständig kopiert?`,
  invalid: $localize`:@@uiSettings-settingsLabels-importError-invalid:Der Spielstand enthält ungültige Werte.`,
  'future-version': $localize`:@@uiSettings-settingsLabels-importError-futureVersion:Der Spielstand stammt aus einer neueren Version des Spiels.`,
  'missing-migration': $localize`:@@uiSettings-settingsLabels-importError-missingMigration:Dieser Spielstand lässt sich nicht in die aktuelle Version umwandeln.`,
  storage: $localize`:@@uiSettings-settingsLabels-importError-storage:Der Speicher des Browsers ist nicht erreichbar.`,
};
