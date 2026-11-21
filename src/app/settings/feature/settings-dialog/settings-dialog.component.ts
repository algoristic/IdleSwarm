import { Component, inject } from '@angular/core';

import { ModalDialogComponent } from '@app/shared/ui/modal-dialog/modal-dialog.component';

import { DialogSettingsComponent } from '../../ui/dialog-settings/dialog-settings.component';
import { DialogSettingsActionsComponent } from '../../ui/dialog-settings-actions/dialog-settings-actions.component';
import { SettingsFacade } from '../state/settings.facade';

/**
 * Dialog „Einstellungen“ (ADR-014) in allen Modi der Shell; geöffnet über den Zahnrad-Knopf,
 * geschlossen über Esc, Schließen oder das endgültige Zurücksetzen.
 */
@Component({
  selector: 'app-settings-dialog',
  imports: [DialogSettingsActionsComponent, DialogSettingsComponent, ModalDialogComponent],
  templateUrl: './settings-dialog.component.html',
  host: { class: 'contents' },
})
export class SettingsDialogComponent {
  facade = inject(SettingsFacade);

  heading = $localize`:@@featureSettings-settingsDialog-heading:Einstellungen`;
}
