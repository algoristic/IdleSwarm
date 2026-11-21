import {
  isAutosaveIntervalMs,
  isMotionSetting,
  isNumberFormat,
  Settings,
} from './models/settings.model';

/** Änderung einer oder mehrerer Einstellungen; fehlende Felder bleiben. */
export type SettingsPatch = Partial<Settings>;

/** Prüft jedes angegebene Feld gegen seine Liste; Laufzeitwerte können aus der Oberfläche kommen. */
export function isValidSettingsPatch(patch: SettingsPatch): boolean {
  const { numberFormat, motion, autosaveIntervalMs } = patch;
  return (
    (numberFormat === undefined || isNumberFormat(numberFormat)) &&
    (motion === undefined || isMotionSetting(motion)) &&
    (autosaveIntervalMs === undefined || isAutosaveIntervalMs(autosaveIntervalMs))
  );
}

/**
 * Übernimmt die angegebenen Felder. Ist ein Feld ungültig oder ändert sich nichts, kommt dasselbe
 * Objekt zurück.
 */
export function updateSettings(settings: Settings, patch: SettingsPatch): Settings {
  if (!isValidSettingsPatch(patch)) {
    return settings;
  }
  const next: Settings = {
    numberFormat: patch.numberFormat ?? settings.numberFormat,
    motion: patch.motion ?? settings.motion,
    autosaveIntervalMs: patch.autosaveIntervalMs ?? settings.autosaveIntervalMs,
  };
  const unchanged =
    next.numberFormat === settings.numberFormat &&
    next.motion === settings.motion &&
    next.autosaveIntervalMs === settings.autosaveIntervalMs;
  return unchanged ? settings : next;
}
