import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FormatDateTimePipe } from '@app/shared/ui/pipes/format-date-time/format-date-time.pipe';
import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatIsoDateTimePipe } from '@app/shared/ui/pipes/format-iso-date-time/format-iso-date-time.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';

import { BuyButtonComponent } from '../../ui/buy-button/buy-button.component';
import { EventLogComponent } from '../../ui/event-log/event-log.component';
import { FeedingSiteComponent } from '../../ui/feeding-site/feeding-site.component';
import { FindsPanelComponent } from '../../ui/finds-panel/finds-panel.component';
import { FormSacrificeDronesComponent } from '../../ui/form-sacrifice-drones/form-sacrifice-drones.component';
import { HudMeterComponent } from '../../ui/hud-meter/hud-meter.component';
import { PheromonePanelComponent } from '../../ui/pheromone-panel/pheromone-panel.component';
import { HudFacade } from '../state/hud.facade';
import type { HudNotice } from '../state/hud.model';

/**
 * Funktionales Prototyp-HUD: Ressourcen, Futterstelle, Käufe, Platz, Pheromone, Funde, Opfern,
 * Ereignis-Log, Speicherstatus und Links zu Umgebung und Genom.
 */
@Component({
  selector: 'app-hud-page',
  imports: [
    BuyButtonComponent,
    EventLogComponent,
    FeedingSiteComponent,
    FindsPanelComponent,
    FormSacrificeDronesComponent,
    FormatDateTimePipe,
    FormatDownPipe,
    FormatIsoDateTimePipe,
    FormatNumPipe,
    FormatRatePipe,
    HudMeterComponent,
    PheromonePanelComponent,
    RouterLink,
  ],
  templateUrl: './hud.page.html',
  host: { class: 'block' },
})
export class HudPage {
  facade = inject(HudFacade);

  spaceLabel = $localize`:@@featureHud-hud-space-title:Platz`;
  noticeTexts: Readonly<Record<HudNotice, string>> = {
    'restored-from-backup': $localize`:@@featureHud-hud-notice-restoredFromBackup:Der Spielstand war beschädigt und wurde aus der Sicherung wiederhergestellt.`,
    'save-unreadable': $localize`:@@featureHud-hud-notice-saveUnreadable:Der Spielstand konnte nicht gelesen werden. Es wurde ein neues Spiel begonnen.`,
    'save-failed': $localize`:@@featureHud-hud-notice-saveFailed:Speichern ist fehlgeschlagen. Es wird beim nächsten Mal erneut versucht.`,
  };
}
