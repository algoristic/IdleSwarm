import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import { HudMeterComponent } from '../hud-meter/hud-meter.component';
import type { SiteView } from './feeding-site.component.model';

/**
 * Titel der Szene (Mockup `.top`): Typ der Futterstelle, Vorrat mit Balken, Restzeit, Nahrungsrate,
 * Reise und bei leerem Vorrat der Weg in die Umgebung.
 */
@Component({
  selector: 'app-feeding-site',
  imports: [
    FormatDownPipe,
    FormatDurationPipe,
    FormatRatePipe,
    FormatUpPipe,
    HudMeterComponent,
    RouterLink,
  ],
  templateUrl: './feeding-site.component.html',
  host: { class: 'block' },
})
export class FeedingSiteComponent {
  site = input.required<SiteView>();
  /** Link „Weiterziehen“ bei leerem Vorrat; erst mit freigeschalteter Umgebung (US-09.04). */
  moveLink = input(true);

  typeLabels = SITE_TYPE_LABELS;

  stockLabel = $localize`:@@uiHud-feedingSite-stock:Vorrat`;
}
