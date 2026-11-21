import { Component, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import type { ImportSaveValue } from './form-import-save.component.model';
import { importSaveSchema } from './form-import-save.schema';

/**
 * Import eines Spielstands (US-07.04): Text einfügen und absenden. Ob er übernommen wird, entscheidet
 * der Aufrufer nach einer Bestätigung; `text` füllt das Feld wieder, wenn der Import scheitert.
 */
@Component({
  selector: 'app-form-import-save',
  imports: [FormField, FormRoot],
  templateUrl: './form-import-save.component.html',
  host: { class: 'block' },
})
export class FormImportSaveComponent {
  text = input('');

  submittedSave = output<string>();

  importModel = linkedSignal<ImportSaveValue>(() => ({ text: this.text() }));
  importForm = form(this.importModel, importSaveSchema, {
    submission: {
      action: async (field) => {
        this.submittedSave.emit(field().value().text);
        return undefined;
      },
    },
  });
}
