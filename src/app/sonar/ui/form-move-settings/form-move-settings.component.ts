import { Component, computed, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import {
  TRANSPORT_PRIORITIES,
  type TransportPriority,
} from '@app/swarm/domain/models/transport-priority.model';

import { parseThresholdPercent } from '../../domain/auto-threshold-logic';
import { PRIORITY_LABELS } from '../sonar-labels/sonar-labels';
import type { MoveSettingsFormValue, MoveSettingsView } from './form-move-settings.component.model';
import { moveSettingsSchema } from './form-move-settings.schema';

function sameSettings(a: MoveSettingsView, b: MoveSettingsView): boolean {
  return (
    a.priority === b.priority &&
    a.autoEnabled === b.autoEnabled &&
    a.thresholdPercent === b.thresholdPercent &&
    a.maxThresholdPercent === b.maxThresholdPercent
  );
}

/**
 * Einstellungen zum Weiterziehen: Mitnahme-Priorität, Auto an/aus und Schwelle; die Strategie
 * schaltet der Titel der Umgebung. Jede gültige Änderung geht sofort als Output hinaus; die
 * Schwelle beim Verlassen des Felds oder mit Enter.
 */
@Component({
  selector: 'app-form-move-settings',
  imports: [FormatNumPipe, FormField, FormRoot],
  templateUrl: './form-move-settings.component.html',
  host: { class: 'block' },
})
export class FormMoveSettingsComponent {
  settings = input.required<MoveSettingsView>();

  priorities = TRANSPORT_PRIORITIES;
  priorityLabels = PRIORITY_LABELS;

  changedPriority = output<TransportPriority>();
  changedAutoEnabled = output<boolean>();
  changedThresholdPercent = output<number>();

  // Das Viewmodel entsteht bei jedem Tick neu; zurückgesetzt wird nur bei geänderten Werten.
  readonly #settings = computed(() => this.settings(), { equal: sameSettings });
  maxThresholdPercent = computed(() => this.#settings().maxThresholdPercent);
  settingsModel = linkedSignal<MoveSettingsFormValue>(() => {
    const { priority, autoEnabled, thresholdPercent } = this.#settings();
    return { priority, autoEnabled, thresholdPercent: String(thresholdPercent) };
  });
  settingsForm = form(this.settingsModel, moveSettingsSchema(this.maxThresholdPercent), {
    submission: {
      action: async () => {
        this.onChangeThreshold();
        return undefined;
      },
    },
  });

  // Die Formularbindung übernimmt Werte beim `input`-Ereignis, also vor `change`.
  onChangePriority(): void {
    this.changedPriority.emit(this.settingsModel().priority);
  }

  onChangeAutoEnabled(): void {
    this.changedAutoEnabled.emit(this.settingsModel().autoEnabled);
  }

  onChangeThreshold(): void {
    const percent = parseThresholdPercent(
      this.settingsModel().thresholdPercent,
      this.maxThresholdPercent(),
    );
    if (percent !== null && percent !== this.#settings().thresholdPercent) {
      this.changedThresholdPercent.emit(percent);
    }
  }
}
