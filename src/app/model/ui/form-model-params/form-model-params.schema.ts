import { schema, validate } from '@angular/forms/signals';

import type { ModelParamsValue } from '../../domain/models/model-params.model';
import { BOT_KINDS } from '../../domain/models/sim.model';
import {
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
  return $localize`:@@uiModel-formModelParams-error-param:Ungültig: Zahl ab 0 eingeben, Dezimaltrenner Komma oder Punkt, kein Tausenderpunkt.`;
}

const CONFLICT_MESSAGES: Readonly<Record<ParamConflict, string>> = {
  candidateDistance: $localize`:@@uiModel-formModelParams-error-conflict-candidateDistance:Darf nicht kleiner sein als candidateMinDistance.`,
  autoThreshold: $localize`:@@uiModel-formModelParams-error-conflict-autoThreshold:Darf nicht kleiner sein als defaultAutoThreshold.`,
  siteTypeWeights: $localize`:@@uiModel-formModelParams-error-conflict-siteTypeWeights:Mindestens ein Ziehungsgewicht muss über 0 liegen.`,
};

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
        const conflict = paramConflicts(valueOf(path.params))[key];
        return conflict === undefined
          ? null
          : { kind: 'paramConflict', message: CONFLICT_MESSAGES[conflict] };
      });
    }
  });
}
