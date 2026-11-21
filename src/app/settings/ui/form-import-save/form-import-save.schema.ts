import { schema, validate } from '@angular/forms/signals';

import type { ImportSaveValue } from './form-import-save.component.model';

/** Nur Leerraum ist kein Import; ob der Text ein Spielstand ist, prüft erst der Import. */
export const importSaveSchema = schema<ImportSaveValue>((path) => {
  validate(path.text, ({ value }) =>
    value().trim() === ''
      ? {
          kind: 'empty',
          message: $localize`:@@uiSettings-formImportSave-error-empty:Füge zuerst einen exportierten Spielstand ein.`,
        }
      : null,
  );
});
