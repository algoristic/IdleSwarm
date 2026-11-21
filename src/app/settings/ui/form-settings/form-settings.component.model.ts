import type { MotionSetting, NumberFormat } from '../../domain/models/settings.model';

/** Werte der Radiogruppen; Radioknöpfe liefern Text, daher das Intervall als Text. */
export interface SettingsFormModel {
  numberFormat: NumberFormat;
  motion: MotionSetting;
  autosaveIntervalMs: string;
}
