import { Component, input, output } from '@angular/core';

import type { SettingsPanel } from '../dialog-settings/dialog-settings.component.model';

/**
 * Fußleiste des Dialogs „Einstellungen“: Zurück, Bestätigen und Abbrechen der Ansichten Export,
 * Import und Zurücksetzen; die Übersicht hat keine. Steht im Slot `[dialogActions]` des
 * `ModalDialogComponent` und bleibt sichtbar, während der Inhalt scrollt.
 */
@Component({
  selector: 'app-dialog-settings-actions',
  templateUrl: './dialog-settings-actions.component.html',
  host: { class: 'grid gap-2' },
})
export class DialogSettingsActionsComponent {
  panel = input.required<SettingsPanel>();

  selectedPanel = output<SettingsPanel>();
  clickedConfirmImport = output<void>();
  clickedConfirmReset = output<void>();

  onSelectPanel(panel: SettingsPanel): void {
    this.selectedPanel.emit(panel);
  }
}
