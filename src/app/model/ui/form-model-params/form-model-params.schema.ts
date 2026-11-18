import { schema, validate } from '@angular/forms/signals';

import type { ModelParamsValue } from '../../domain/models/model-params.model';
import { BOT_KINDS } from '../../domain/models/sim.model';
import { isValidParam, ParamKey } from '../../domain/params-logic';

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
          : {
              kind: 'invalidParam',
              message: $localize`:@@uiModel-formModelParams-error-param:Ungültig: Zahl ab 0 eingeben, Dezimaltrenner Komma oder Punkt, kein Tausenderpunkt.`,
            },
      );
    }
  });
}
