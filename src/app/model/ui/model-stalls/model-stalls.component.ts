import { Component, input, model } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import type { BotStalls, StallKind, StallThresholdValue } from '../../domain/models/stall.model';
import { defaultStallThreshold } from '../../domain/stall-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import { FormStallThresholdComponent } from '../form-stall-threshold/form-stall-threshold.component';

/** Stillstands-Warnungen je Bot (US-10.06); `null`, solange die Schwelle ungültig ist. */
@Component({
  selector: 'app-model-stalls',
  imports: [FormatElapsedPipe, FormStallThresholdComponent],
  templateUrl: './model-stalls.component.html',
  host: { class: 'block' },
})
export class ModelStallsComponent {
  stalls = input.required<readonly BotStalls[] | null>();
  thresholdModel = model<StallThresholdValue>(defaultStallThreshold());

  botLabels = BOT_LABELS;

  kindLabels: Readonly<Record<StallKind, string>> = {
    noCombatCapture: $localize`:@@uiModel-modelStalls-kind-noCombatCapture:Kein Kampfziel`,
    noDeparture: $localize`:@@uiModel-modelStalls-kind-noDeparture:Kein Aufbruch`,
  };
}
