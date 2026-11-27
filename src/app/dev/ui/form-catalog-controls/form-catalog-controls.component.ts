import { Component, computed, input, model } from '@angular/core';
import { form, FormField, max, min } from '@angular/forms/signals';

import { UNIT_IDS } from '@app/game/domain/models/unit.model';
import { UNIT_TEXTS } from '@app/game/ui/texts/game-texts';
import { FormatIntegerPipe } from '@app/shared/ui/pipes/format-integer/format-integer.pipe';

import { parseLevel, unitsForLevel } from '../../domain/catalog-logic';
import { CATALOG_CHOICE_OPTIONS, CATALOG_LEVEL_MAX } from '../../domain/data/catalog.data';
import { CatalogControlId, CatalogControlsModel } from '../../domain/models/catalog.model';
import { FormChoiceComponent } from '../form-choice/form-choice.component';
import { CATALOG_CONTROL_NAMES, CATALOG_OPTION_NAMES } from '../texts/catalog-texts';
import { CatalogControlRow } from './form-catalog-controls.model';

@Component({
  selector: 'app-form-catalog-controls',
  imports: [FormChoiceComponent, FormField, FormatIntegerPipe],
  templateUrl: './form-catalog-controls.component.html',
  host: { class: 'block' },
})
export class FormCatalogControlsComponent {
  controls = input.required<readonly CatalogControlId[]>();

  unitTexts = UNIT_TEXTS;

  controlsModel = model.required<CatalogControlsModel>();

  controlsForm = form(this.controlsModel, (path) => {
    min(path.level, 0);
    max(path.level, CATALOG_LEVEL_MAX);
  });

  rows = computed<CatalogControlRow[]>(() =>
    this.controls().map((id) => ({
      id,
      label: CATALOG_CONTROL_NAMES[id],
      testId: `dev.catalog.control.${id}`,
      choice:
        id === 'level'
          ? null
          : {
              field: this.controlsForm[id],
              options: CATALOG_CHOICE_OPTIONS[id].map((option) => ({
                id: option,
                label: CATALOG_OPTION_NAMES[id][option] ?? option,
                testId: `dev.catalog.control.${id}.${option}`,
              })),
            },
    })),
  );
  units = computed(() =>
    unitsForLevel(parseLevel(this.controlsModel().level))
      .map((count, k) => ({ unit: UNIT_IDS[k], count }))
      .filter((entry) => entry.count > 0),
  );
}
