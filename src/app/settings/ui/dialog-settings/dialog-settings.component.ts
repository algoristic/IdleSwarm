import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  input,
  output,
  viewChild,
} from '@angular/core';

import { FormatDateTimePipe } from '@app/shared/ui/pipes/format-date-time/format-date-time.pipe';
import { FormatIsoDateTimePipe } from '@app/shared/ui/pipes/format-iso-date-time/format-iso-date-time.pipe';

import type { SettingsPatch } from '../../domain/settings-logic';
import { FormImportSaveComponent } from '../form-import-save/form-import-save.component';
import { FormSettingsComponent } from '../form-settings/form-settings.component';
import { IMPORT_ERROR_TEXTS } from '../settings-labels/settings-labels';
import type {
  SettingsDialogView,
  SettingsPanel,
  SettingsView,
} from './dialog-settings.component.model';

/**
 * Inhalt des Dialogs „Einstellungen“ (US-09.01, US-07.04, US-07.05): Übersicht mit Anzeige,
 * Speichern, Hinweisen und Info; Export, Import mit Bestätigung und Zurücksetzen in zwei Schritten
 * als eigene Ansichten. Welche Ansicht offen ist, hält der Aufrufer.
 */
@Component({
  selector: 'app-dialog-settings',
  imports: [
    FormatDateTimePipe,
    FormatIsoDateTimePipe,
    FormImportSaveComponent,
    FormSettingsComponent,
  ],
  templateUrl: './dialog-settings.component.html',
  host: { class: 'block' },
})
export class DialogSettingsComponent {
  view = input.required<SettingsView>();
  dialog = input.required<SettingsDialogView>();

  importErrorTexts = IMPORT_ERROR_TEXTS;

  changedSettings = output<SettingsPatch>();
  selectedPanel = output<SettingsPanel>();
  submittedImport = output<string>();
  clickedConfirmImport = output<void>();
  clickedCopy = output<void>();
  clickedResetHints = output<void>();
  clickedConfirmReset = output<void>();

  panelHeading = viewChild<ElementRef<HTMLElement>>('panelHeading');

  #panel = computed(() => this.dialog().panel);

  /** Zuletzt gerenderte Ansicht; `null` bis zum ersten Rendern. */
  #renderedPanel: SettingsPanel | null = null;

  constructor() {
    // Beim Wechsel der Ansicht verschwindet der gedrückte Knopf; der Fokus geht auf den Titel der
    // neuen Ansicht, nicht beim ersten Öffnen (dort setzt ihn der Dialog).
    afterRenderEffect(() => {
      const panel = this.#panel();
      if (this.#renderedPanel !== null && this.#renderedPanel !== panel) {
        this.panelHeading()?.nativeElement.focus({ preventScroll: true });
      }
      this.#renderedPanel = panel;
    });
  }

  onSelectPanel(panel: SettingsPanel): void {
    this.selectedPanel.emit(panel);
  }

  /** Ein Klick oder Fokus markiert den ganzen Export-Text zum Kopieren. */
  onSelectExport(event: Event): void {
    if (event.target instanceof HTMLTextAreaElement) {
      event.target.select();
    }
  }
}
