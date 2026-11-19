import { schema, validate } from '@angular/forms/signals';

import { parseThresholdPercent } from '../../domain/auto-threshold-logic';
import type { MoveSettingsFormValue } from './form-move-settings.component.model';

/** Regeln der Einstellungen; `maxPercent` liest die Obergrenze reaktiv aus dem Input. */
export function moveSettingsSchema(maxPercent: () => number) {
  return schema<MoveSettingsFormValue>((path) => {
    validate(path.thresholdPercent, ({ value }) => {
      const max = maxPercent();
      return parseThresholdPercent(value(), max) === null
        ? {
            kind: 'threshold',
            message: $localize`:@@uiSonar-formMoveSettings-error-threshold:Ganze Zahl von 0 bis ${max}:max: eingeben.`,
          }
        : null;
    });
  });
}
