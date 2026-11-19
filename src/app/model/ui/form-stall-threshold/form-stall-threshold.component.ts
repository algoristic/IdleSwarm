import { Component, model } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import type { StallThresholdValue } from '../../domain/models/stall.model';
import { defaultStallThreshold } from '../../domain/stall-logic';
import { stallThresholdSchema } from './form-stall-threshold.schema';

/** Schwelle der Stillstands-Warnungen; das Modell hält der `feature`-Layer, Änderungen wirken sofort. */
@Component({
  selector: 'app-form-stall-threshold',
  imports: [FormField],
  templateUrl: './form-stall-threshold.component.html',
  host: { class: 'block' },
})
export class FormStallThresholdComponent {
  thresholdModel = model<StallThresholdValue>(defaultStallThreshold());

  thresholdForm = form(this.thresholdModel, stallThresholdSchema);
}
