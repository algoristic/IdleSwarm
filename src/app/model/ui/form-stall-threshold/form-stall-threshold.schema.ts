import { schema, validate } from '@angular/forms/signals';

import type { StallThresholdValue } from '../../domain/models/stall.model';
import { parseStallThresholdMinutes } from '../../domain/stall-logic';

export const stallThresholdSchema = schema<StallThresholdValue>((path) => {
  validate(path.minutes, ({ value }) =>
    parseStallThresholdMinutes(value()) === null
      ? {
          kind: 'invalidThreshold',
          message: $localize`:@@uiModel-formStallThreshold-error:Ganze Minuten ab 1 eingeben.`,
        }
      : null,
  );
});
