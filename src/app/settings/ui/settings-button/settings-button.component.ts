import { Component, output } from '@angular/core';

/** Zahnrad-Knopf, der den Dialog „Einstellungen“ öffnet; in allen Modi im Kopf der Shell. */
@Component({
  selector: 'app-settings-button',
  templateUrl: './settings-button.component.html',
  host: { class: 'block' },
})
export class SettingsButtonComponent {
  clickedOpen = output<void>();

  label = $localize`:@@uiSettings-settingsButton-label:Einstellungen`;

  onClick(): void {
    this.clickedOpen.emit();
  }
}
