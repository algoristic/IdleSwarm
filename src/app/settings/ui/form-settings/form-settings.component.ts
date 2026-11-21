import { Component, input, linkedSignal, output } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { Num } from '@app/shared/util/num/num';

import {
  AUTOSAVE_INTERVALS_MS,
  MOTION_SETTINGS,
  NUMBER_FORMATS,
  Settings,
} from '../../domain/models/settings.model';
import { parseAutosaveIntervalMs, SettingsPatch } from '../../domain/settings-logic';
import {
  AUTOSAVE_INTERVAL_LABELS,
  MOTION_SETTING_LABELS,
  NUMBER_FORMAT_LABELS,
} from '../settings-labels/settings-labels';
import type { SettingsFormModel } from './form-settings.component.model';

/** Beispiel je Zahlenformat: `12,35 Mrd.`, `1,23e10`, `12,35e9`. */
const EXAMPLE_NUMBER = Num.from('1.2345e10');

/**
 * Anzeige- und Speicher-Einstellungen als Radiogruppen (US-09.01). Jede Auswahl wirkt sofort:
 * Das Formular meldet die geänderten Werte über `changedSettings`, das Modell folgt danach wieder
 * dem Spielstand.
 */
@Component({
  selector: 'app-form-settings',
  imports: [FormatNumPipe, FormField, FormRoot],
  templateUrl: './form-settings.component.html',
  host: { class: 'block' },
})
export class FormSettingsComponent {
  settings = input.required<Settings>();

  numberFormats = NUMBER_FORMATS;
  motionSettings = MOTION_SETTINGS;
  autosaveIntervals = AUTOSAVE_INTERVALS_MS.map((ms) => ({
    value: String(ms),
    label: AUTOSAVE_INTERVAL_LABELS[ms],
  }));
  numberFormatLabels = NUMBER_FORMAT_LABELS;
  motionLabels = MOTION_SETTING_LABELS;
  example = EXAMPLE_NUMBER;

  changedSettings = output<SettingsPatch>();

  // Die Einstellungen ändern ihre Referenz nur bei einer echten Änderung, nicht mit jedem Tick.
  settingsModel = linkedSignal<SettingsFormModel>(() => {
    const { numberFormat, motion, autosaveIntervalMs } = this.settings();
    return { numberFormat, motion, autosaveIntervalMs: String(autosaveIntervalMs) };
  });
  settingsForm = form(this.settingsModel);

  /** `change` steigt vom Radioknopf auf, nachdem `FormField` das Modell beim `input` gesetzt hat. */
  onChange(): void {
    const { numberFormat, motion, autosaveIntervalMs } = this.settingsModel();
    const patch: SettingsPatch = { numberFormat, motion };
    const interval = parseAutosaveIntervalMs(autosaveIntervalMs);
    this.changedSettings.emit(
      interval === null ? patch : { ...patch, autosaveIntervalMs: interval },
    );
  }
}
