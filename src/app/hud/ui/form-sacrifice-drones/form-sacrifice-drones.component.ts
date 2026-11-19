import { Component, computed, input, output, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import type { Num } from '@app/shared/util/num/num';

import { parseWholeCount } from '../../domain/sacrifice-count-logic';
import type { SacrificeDronesValue, SacrificeView } from './form-sacrifice-drones.component.model';
import { sacrificeDronesSchema } from './form-sacrifice-drones.schema';

/** Drohnen opfern (US-04.07): Anzahl wählen, Ertrag und Umwandlungsverlust vorab sehen. */
@Component({
  selector: 'app-form-sacrifice-drones',
  imports: [FormatDownPipe, FormatNumPipe, FormatRatePipe, FormField, FormRoot],
  templateUrl: './form-sacrifice-drones.component.html',
  host: { class: 'block' },
})
export class FormSacrificeDronesComponent {
  sacrifice = input.required<SacrificeView>();

  submittedCount = output<number>();

  sacrificeModel = signal<SacrificeDronesValue>({ count: '' });
  sacrificeForm = form(
    this.sacrificeModel,
    sacrificeDronesSchema(() => this.sacrifice().maxCount),
    {
      submission: {
        action: async () => {
          const count = this.#validCount();
          if (count !== null) {
            this.submittedCount.emit(count);
            this.sacrificeForm().reset({ count: '' });
          }
          return undefined;
        },
      },
    },
  );

  /** Gültige Anzahl oder `null`; die Obergrenze folgt den vorhandenen Drohnen. */
  #validCount = computed<number | null>(() => {
    const count = parseWholeCount(this.sacrificeModel().count);
    return count !== null && count >= 1 && count <= this.sacrifice().maxCount ? count : null;
  });
  yieldPreview = computed<Num | null>(() => {
    const count = this.#validCount();
    return count === null ? null : this.sacrifice().foodPerDrone.mul(count);
  });
}
