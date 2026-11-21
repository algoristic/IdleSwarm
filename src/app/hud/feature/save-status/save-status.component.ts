import { Component, inject } from '@angular/core';

import { FormatDateTimePipe } from '@app/shared/ui/pipes/format-date-time/format-date-time.pipe';
import { FormatIsoDateTimePipe } from '@app/shared/ui/pipes/format-iso-date-time/format-iso-date-time.pipe';

import { HudFacade } from '../state/hud.facade';
import type { HudNotice } from '../state/hud.model';

/** Speicherstatus und Hinweise zum Spielstand; die Shell zeigt sie in allen Modi unter den Ressourcen. */
@Component({
  selector: 'app-save-status',
  imports: [FormatDateTimePipe, FormatIsoDateTimePipe],
  templateUrl: './save-status.component.html',
  host: { class: 'block' },
})
export class SaveStatusComponent {
  facade = inject(HudFacade);

  noticeTexts: Readonly<Record<HudNotice, string>> = {
    'restored-from-backup': $localize`:@@featureHud-saveStatus-notice-restoredFromBackup:Der Spielstand war beschädigt und wurde aus der Sicherung wiederhergestellt.`,
    'save-unreadable': $localize`:@@featureHud-saveStatus-notice-saveUnreadable:Der Spielstand konnte nicht gelesen werden. Es wurde ein neues Spiel begonnen.`,
    'save-failed': $localize`:@@featureHud-saveStatus-notice-saveFailed:Speichern ist fehlgeschlagen. Es wird beim nächsten Mal erneut versucht.`,
    'update-ready': $localize`:@@featureHud-saveStatus-notice-updateReady:Neue Version verfügbar. Sie startet beim nächsten Öffnen.`,
  };
}
