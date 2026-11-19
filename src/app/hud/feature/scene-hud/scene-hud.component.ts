import { Component, inject } from '@angular/core';

import { FormatDateTimePipe } from '@app/shared/ui/pipes/format-date-time/format-date-time.pipe';
import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatIsoDateTimePipe } from '@app/shared/ui/pipes/format-iso-date-time/format-iso-date-time.pipe';

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
 * HUD der Szene (Prototyp bis AP 1.4.3): Futterstelle, Platz, Käufe, Pheromone, Funde, Opfern,
 * Ereignis-Log und Speicherstatus.
 */
@Component({
  selector: 'app-scene-hud',
  imports: [
    BuyButtonComponent,
    EventLogComponent,
    FeedingSiteComponent,
    FindsPanelComponent,
    FormSacrificeDronesComponent,
    FormatDateTimePipe,
    FormatDownPipe,
    FormatIsoDateTimePipe,
    HudMeterComponent,
    PheromonePanelComponent,
  ],
  templateUrl: './scene-hud.component.html',
  host: { class: 'block' },
})
export class SceneHudComponent {
  facade = inject(HudFacade);

  spaceLabel = $localize`:@@featureHud-sceneHud-space-title:Platz`;
  noticeTexts: Readonly<Record<HudNotice, string>> = {
    'restored-from-backup': $localize`:@@featureHud-sceneHud-notice-restoredFromBackup:Der Spielstand war beschädigt und wurde aus der Sicherung wiederhergestellt.`,
    'save-unreadable': $localize`:@@featureHud-sceneHud-notice-saveUnreadable:Der Spielstand konnte nicht gelesen werden. Es wurde ein neues Spiel begonnen.`,
    'save-failed': $localize`:@@featureHud-sceneHud-notice-saveFailed:Speichern ist fehlgeschlagen. Es wird beim nächsten Mal erneut versucht.`,
  };
}
