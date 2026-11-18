import { Component, ElementRef, input, output, viewChild } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';

import { HudMeterComponent } from '../hud-meter/hud-meter.component';
import type { SiteView } from './feeding-site.component.model';

/** Futterstelle: Nahrungsrate, Vorrat, Restzeit und Erneuern bei leerem Vorrat. */
@Component({
  selector: 'app-feeding-site',
  imports: [FormatDownPipe, FormatDurationPipe, FormatRatePipe, FormatUpPipe, HudMeterComponent],
  templateUrl: './feeding-site.component.html',
  host: { class: 'block' },
})
export class FeedingSiteComponent {
  site = input.required<SiteView>();

  clickedRenew = output();

  title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');

  stockLabel = $localize`:@@uiHud-feedingSite-stock:Vorrat`;

  onRenew(): void {
    this.clickedRenew.emit();
    // Der Knopf verschwindet gleich; der Fokus darf nicht mit ihm verloren gehen.
    this.title().nativeElement.focus();
  }
}
