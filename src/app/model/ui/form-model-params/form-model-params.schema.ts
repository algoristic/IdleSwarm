import { schema, validate } from '@angular/forms/signals';

import type { ModelParamsValue } from '../../domain/models/model-params.model';
import { BOT_KINDS } from '../../domain/models/sim.model';
import {
  findWeightConflictsAt,
  formatParam,
  isValidParam,
  ParamConflict,
  paramConflicts,
  ParamKey,
  ParamLimit,
  paramLimit,
} from '../../domain/params-logic';

function invalidParamMessage(limit: ParamLimit): string {
  const min = formatParam(limit.min);
  if (limit.integer) {
    return $localize`:@@uiModel-formModelParams-error-paramInteger:Ungültig: ganze Zahl ab ${min}:min: eingeben.`;
  }
  if (limit.max !== undefined) {
    const max = formatParam(limit.max);
    return $localize`:@@uiModel-formModelParams-error-paramRange:Ungültig: Zahl von ${min}:min: bis ${max}:max: eingeben, Dezimaltrenner Komma oder Punkt.`;
  }
  if (limit.min !== 0) {
    return $localize`:@@uiModel-formModelParams-error-paramMin:Ungültig: Zahl ab ${min}:min: eingeben, Dezimaltrenner Komma oder Punkt, kein Tausenderpunkt.`;
  }
  return $localize`:@@uiModel-formModelParams-error-param:Ungültig: Zahl ab 0 eingeben, Dezimaltrenner Komma oder Punkt, kein Tausenderpunkt.`;
}

type FixedConflict = Exclude<ParamConflict, 'findWeights'>;

const CONFLICT_MESSAGES: Readonly<Record<FixedConflict, string>> = {
  candidateDistance: $localize`:@@uiModel-formModelParams-error-conflict-candidateDistance:Darf nicht kleiner sein als candidateMinDistance.`,
  autoThreshold: $localize`:@@uiModel-formModelParams-error-conflict-autoThreshold:Darf nicht kleiner sein als defaultAutoThreshold.`,
  siteTypeWeights: $localize`:@@uiModel-formModelParams-error-conflict-siteTypeWeights:Mindestens ein Ziehungsgewicht muss über 0 liegen.`,
};

// Wie die übrigen Meldungen nennt sie Schlüssel statt Namen: die Typ-IDs der betroffenen Typen.
function findWeightsMessage(params: ModelParamsValue['params'], key: ParamKey): string {
  const siteTypes = findWeightConflictsAt(params, key).join(', ');
  return $localize`:@@uiModel-formModelParams-error-conflict-findWeights:Mindestens ein Fundgewicht an ${siteTypes}:siteTypes: muss über 0 liegen.`;
}

/** Regeln des Parameter-Panels; die Prüfungen selbst liegen in `model/domain`. */
export function modelParamsSchema(keys: readonly ParamKey[]) {
  return schema<ModelParamsValue>((path) => {
    validate(path.seed, ({ value }) =>
      value().trim() === ''
        ? {
            kind: 'required',
            message: $localize`:@@uiModel-formModelParams-error-seed:Seed angeben.`,
          }
        : null,
    );
    validate(path.bots, ({ value }) =>
      BOT_KINDS.some((kind) => value()[kind])
        ? null
        : {
            kind: 'noBot',
            message: $localize`:@@uiModel-formModelParams-error-bots:Mindestens einen Bot wählen.`,
          },
    );
    for (const key of keys) {
      validate(path.params[key], ({ value }) =>
        isValidParam(key, value())
          ? null
          : { kind: 'invalidParam', message: invalidParamMessage(paramLimit(key)) },
      );
      validate(path.params[key], ({ valueOf }) => {
        const params = valueOf(path.params);
        const conflict = paramConflicts(params)[key];
        if (conflict === undefined) {
          return null;
        }
        const message =
          conflict === 'findWeights'
            ? findWeightsMessage(params, key)
            : CONFLICT_MESSAGES[conflict];
        return { kind: 'paramConflict', message };
      });
    }
  });
}
