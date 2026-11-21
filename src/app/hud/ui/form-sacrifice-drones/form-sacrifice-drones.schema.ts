import { disabled, schema, validate } from '@angular/forms/signals';

import { DEFAULT_NOTATION, formatNum, Notation } from '@app/shared/util/format/format';

import { parseWholeCount } from '../../domain/sacrifice-count-logic';
import type { SacrificeDronesValue } from './form-sacrifice-drones.component.model';

/**
 * Regeln des Opfern-Formulars: ganze Zahl von 1 bis zu den vorhandenen ganzen Drohnen; die Meldung
 * schreibt die Obergrenze im eingestellten Zahlenformat.
 */
export function sacrificeDronesSchema(
  maxCount: () => number,
  notation: () => Notation = () => DEFAULT_NOTATION,
) {
  return schema<SacrificeDronesValue>((path) => {
    disabled(path.count, () => maxCount() < 1);
    validate(path.count, ({ value }) => {
      const count = parseWholeCount(value());
      if (count === null || count < 1) {
        return {
          kind: 'invalidCount',
          message: $localize`:@@uiHud-formSacrificeDrones-error-count:Anzahl als ganze Zahl ab 1 eingeben.`,
        };
      }
      const max = maxCount();
      return count > max
        ? {
            kind: 'tooMany',
            message: $localize`:@@uiHud-formSacrificeDrones-error-tooMany:Höchstens ${formatNum(max, { notation: notation() })}:max: Drohnen vorhanden.`,
          }
        : null;
    });
  });
}
