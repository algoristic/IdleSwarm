import { BalanceParams } from '../core/balance/constants';

export type ParamKey = keyof BalanceParams;
export type ParamOverrides = Partial<Record<ParamKey, number>>;
export type ParamDrafts = Readonly<Partial<Record<ParamKey, string>>>;

export interface ParamLimit {
  readonly min: number;
  readonly max?: number;
}

export interface ParamField {
  readonly key: ParamKey;
  readonly defaultValue: number;
  readonly defaultText: string;
  readonly text: string;
  /** `null` bei ungültiger Eingabe. */
  readonly value: number | null;
  readonly changed: boolean;
}

const DEFAULT_LIMIT: ParamLimit = { min: 0 };
const PARAM_LIMITS: Partial<Readonly<Record<ParamKey, ParamLimit>>> = {
  broodDroneShare: { min: 0, max: 1 },
};

const NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
/** `20.000` meint auf Deutsch 20000, wäre als Dezimalzahl aber 20; daher abgelehnt. */
const THOUSANDS_PATTERN = /^[+-]?\d{1,3}(?:\.\d{3})+$/;

export function formatParam(value: number): string {
  return String(value).replace('.', ',');
}

/** Liest eine Eingabe mit Komma oder Punkt; `null`, wenn sie ungültig ist oder die Grenzen verletzt. */
export function parseParam(text: string, limit: ParamLimit = DEFAULT_LIMIT): number | null {
  const trimmed = text.trim();
  if (THOUSANDS_PATTERN.test(trimmed)) {
    return null;
  }
  const normalized = trimmed.replace(',', '.');
  if (!NUMBER_PATTERN.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  const inRange = value >= limit.min && (limit.max === undefined || value <= limit.max);
  return Number.isFinite(value) && inRange ? value : null;
}

/** Felder direkt aus dem Objekt, damit neue Konstanten von selbst erscheinen. */
export function paramFields(defaults: BalanceParams, drafts: ParamDrafts): readonly ParamField[] {
  return (Object.keys(defaults) as ParamKey[]).map((key) => {
    const defaultValue = defaults[key];
    const defaultText = formatParam(defaultValue);
    const text = drafts[key] ?? defaultText;
    const value = parseParam(text, PARAM_LIMITS[key]);
    return { key, defaultValue, defaultText, text, value, changed: value !== defaultValue };
  });
}

/** Gültige, vom Standard abweichende Werte. */
export function changedParams(fields: readonly ParamField[]): ParamOverrides {
  const changed: ParamOverrides = {};
  for (const { key, value, changed: isChanged } of fields) {
    if (isChanged && value !== null) {
      changed[key] = value;
    }
  }
  return changed;
}

export function paramsToJson(overrides: ParamOverrides): string {
  return JSON.stringify(overrides, null, 2);
}
