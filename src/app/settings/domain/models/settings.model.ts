import { MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';

/** Zahlenformat (TK §9): Kurzformen, wissenschaftlich oder technisch; stabile IDs. */
export const NUMBER_FORMATS = ['short', 'scientific', 'engineering'] as const;
export type NumberFormat = (typeof NUMBER_FORMATS)[number];

/** Animationen: `system` folgt `prefers-reduced-motion`; stabile IDs. */
export const MOTION_SETTINGS = ['system', 'full', 'reduced'] as const;
export type MotionSetting = (typeof MOTION_SETTINGS)[number];

/** Wählbare Autosave-Intervalle in Millisekunden: 10 s, 30 s, 60 s, 5 min. */
export const AUTOSAVE_INTERVALS_MS = [
  10 * MS_PER_SECOND,
  30 * MS_PER_SECOND,
  MS_PER_MINUTE,
  5 * MS_PER_MINUTE,
] as const;
/** Aus Konstanten berechnet, daher `number`; gültig sind nur die Werte der Liste. */
export type AutosaveIntervalMs = (typeof AUTOSAVE_INTERVALS_MS)[number];

/** Spielereinstellungen, gespeichert mit dem Spielstand (US-09.01, Game-Design §5.2). */
export interface Settings {
  readonly numberFormat: NumberFormat;
  readonly motion: MotionSetting;
  readonly autosaveIntervalMs: AutosaveIntervalMs;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({
  numberFormat: 'short',
  motion: 'system',
  autosaveIntervalMs: 30 * MS_PER_SECOND,
});

export function isNumberFormat(value: unknown): value is NumberFormat {
  return (NUMBER_FORMATS as readonly unknown[]).includes(value);
}

export function isMotionSetting(value: unknown): value is MotionSetting {
  return (MOTION_SETTINGS as readonly unknown[]).includes(value);
}

export function isAutosaveIntervalMs(value: unknown): value is AutosaveIntervalMs {
  return (AUTOSAVE_INTERVALS_MS as readonly unknown[]).includes(value);
}
