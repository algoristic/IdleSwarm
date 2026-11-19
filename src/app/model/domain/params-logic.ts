import { BalanceParams } from '@app/balance/domain/constants';
import { SITE_TYPE_PARAMS } from '@app/balance/domain/formulas';
import { NumberRange, parseDecimal } from '@app/shared/util/parse/parse';

export type ParamKey = keyof BalanceParams;
export type ParamOverrides = Partial<Record<ParamKey, number>>;
export type ParamDrafts = Readonly<Partial<Record<ParamKey, string>>>;

export interface ParamLimit extends NumberRange {
  /** Zählwert: die Eingabe bleibt eine Dezimalzahl, muss aber ganzzahlig sein (`6`, `6,0`). */
  readonly integer?: true;
}

/** Widersprüche zwischen Konstanten, die jede für sich gültig sind. */
export const PARAM_CONFLICTS = ['candidateDistance', 'autoThreshold', 'siteTypeWeights'] as const;
export type ParamConflict = (typeof PARAM_CONFLICTS)[number];
/** Konflikt je Feld, an dem er gemeldet wird. */
export type ParamConflicts = Partial<Readonly<Record<ParamKey, ParamConflict>>>;

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
const SHARE_LIMIT: ParamLimit = { min: 0, max: 1 };
const PARAM_LIMITS: Partial<Readonly<Record<ParamKey, ParamLimit>>> = {
  startQueens: { min: 0, integer: true },
  startPheromoneDrones: { min: 0, integer: true },
  startPheromoneSoldiers: { min: 0, integer: true },
  candidateCount: { min: 1, integer: true },
  siteSpread: SHARE_LIMIT,
  sacrificeYield: SHARE_LIMIT,
  minSacrificeLoss: SHARE_LIMIT,
  fallenRecycleYield: SHARE_LIMIT,
  balancedMaxLossShare: SHARE_LIMIT,
  defaultAutoThreshold: SHARE_LIMIT,
  maxAutoThreshold: SHARE_LIMIT,
};

// Je Futterstellentyp aus der Tabelle in `balance`, damit neue Typen von selbst erfasst werden.
const SITE_TYPE_KEYS = Object.values(SITE_TYPE_PARAMS);
const FIND_CHANCE_KEYS: ReadonlySet<ParamKey> = new Set(
  SITE_TYPE_KEYS.map((keys) => keys.findChance),
);
const WEIGHT_KEYS: ReadonlySet<ParamKey> = new Set(SITE_TYPE_KEYS.map((keys) => keys.weight));

/** Grenzen der Konstante; Anteile in [0; 1], Zählwerte ganzzahlig, sonst ab 0. */
export function paramLimit(key: ParamKey): ParamLimit {
  return PARAM_LIMITS[key] ?? (FIND_CHANCE_KEYS.has(key) ? SHARE_LIMIT : DEFAULT_LIMIT);
}

export function formatParam(value: number): string {
  return String(value).replace('.', ',');
}

/** Liest eine Eingabe mit Komma oder Punkt; `null`, wenn sie ungültig ist oder die Grenzen verletzt. */
export function parseParam(text: string, limit: ParamLimit = DEFAULT_LIMIT): number | null {
  const value = parseDecimal(text, limit);
  return value !== null && limit.integer && !Number.isInteger(value) ? null : value;
}

/** Felder direkt aus dem Objekt, damit neue Konstanten von selbst erscheinen. */
export function paramFields(defaults: BalanceParams, drafts: ParamDrafts): readonly ParamField[] {
  return (Object.keys(defaults) as ParamKey[]).map((key) => {
    const defaultValue = defaults[key];
    const defaultText = formatParam(defaultValue);
    const text = drafts[key] ?? defaultText;
    const value = parseParam(text, paramLimit(key));
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

/** Prüft eine Eingabe gegen die Grenzen der Konstante. */
export function isValidParam(key: ParamKey, text: string): boolean {
  return parseParam(text, paramLimit(key)) !== null;
}

/**
 * Widersprüche zwischen gültigen Eingaben: kleinste Kandidatendistanz über der größten,
 * Standard-Schwelle über der höchsten, keine Typgewichte. Ungültige oder fehlende Eingaben
 * prüft das jeweilige Feld selbst; sie lösen hier keinen Konflikt aus.
 */
export function paramConflicts(drafts: ParamDrafts): ParamConflicts {
  const value = (key: ParamKey): number | null => {
    const text = drafts[key];
    return text === undefined ? null : parseParam(text, paramLimit(key));
  };
  const conflicts: Partial<Record<ParamKey, ParamConflict>> = {};
  const minDistance = value('candidateMinDistance');
  const maxDistance = value('candidateMaxDistance');
  if (minDistance !== null && maxDistance !== null && minDistance > maxDistance) {
    conflicts.candidateMaxDistance = 'candidateDistance';
  }
  const defaultThreshold = value('defaultAutoThreshold');
  const maxThreshold = value('maxAutoThreshold');
  if (defaultThreshold !== null && maxThreshold !== null && defaultThreshold > maxThreshold) {
    conflicts.maxAutoThreshold = 'autoThreshold';
  }
  const weightKeys = (Object.keys(drafts) as ParamKey[]).filter((key) => WEIGHT_KEYS.has(key));
  const weights = weightKeys.map(value);
  if (weights.length > 0 && weights.every((weight) => weight === 0)) {
    for (const key of weightKeys) {
      conflicts[key] = 'siteTypeWeights';
    }
  }
  return conflicts;
}

export function hasParamConflicts(drafts: ParamDrafts): boolean {
  return Object.keys(paramConflicts(drafts)).length > 0;
}
