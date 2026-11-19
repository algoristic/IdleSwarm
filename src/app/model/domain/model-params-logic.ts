import type { BalanceParams } from '@app/balance/domain/constants';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import type { ModelParamsValue } from './models/model-params.model';
import { BOT_KINDS, SimConfig } from './models/sim.model';
import {
  changedParams,
  formatParam,
  hasParamConflicts,
  ParamKey,
  paramFields,
} from './params-logic';

/** Wählbare Laufdauern: 1 h, 6 h, 24 h, 7 d. */
export const DURATIONS_MS = [
  MS_PER_HOUR,
  6 * MS_PER_HOUR,
  24 * MS_PER_HOUR,
  7 * 24 * MS_PER_HOUR,
] as const;

const DEFAULT_SEED = 'modell';
const DEFAULT_DURATION_MS = 24 * MS_PER_HOUR;

/** Startwerte: fester Seed, 24 h, Aktiv und Idle, alle Konstanten auf Standard. */
export function defaultModelParams(defaults: BalanceParams): ModelParamsValue {
  const params = Object.fromEntries(
    (Object.keys(defaults) as ParamKey[]).map((key) => [key, formatParam(defaults[key])]),
  ) as Record<ParamKey, string>;
  return {
    seed: DEFAULT_SEED,
    durationMs: String(DEFAULT_DURATION_MS),
    bots: { active: true, idle: true, 'drone-heavy': false, 'soldier-heavy': false },
    params,
  };
}

/** Konfiguration des Laufs; `null`, solange eine Eingabe ungültig ist oder Konstanten sich widersprechen. */
export function toSimConfig(value: ModelParamsValue, defaults: BalanceParams): SimConfig | null {
  const seed = value.seed.trim();
  const kinds = BOT_KINDS.filter((kind) => value.bots[kind]);
  const fields = paramFields(defaults, value.params);
  if (
    seed === '' ||
    kinds.length === 0 ||
    fields.some((field) => field.value === null) ||
    hasParamConflicts(value.params)
  ) {
    return null;
  }
  return {
    seed,
    durationMs: Number(value.durationMs),
    bots: kinds.map((kind) => ({ kind })),
    params: changedParams(fields),
  };
}

/** Gleichwertige Konfigurationen (`10` und `10,0`) lösen keinen neuen Lauf aus. */
export function sameSimConfig(a: SimConfig | null, b: SimConfig | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
