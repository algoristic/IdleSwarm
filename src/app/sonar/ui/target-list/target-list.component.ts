import { Component, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { TargetView } from '../models/target.model';
import { VERDICT_LABELS, VERDICT_TONES } from '../sonar-labels/sonar-labels';

/**
 * Ziele der Umgebung mit Urteil und Markierung der Strategie. Jedes Ziel lässt sich für das
 * Detailpanel auswählen, auch außer Reichweite; unerforschte zeigen nur „?“ (US-04.03).
 */
@Component({
  selector: 'app-target-list',
  imports: [FormatDownPipe, FormatRatePipe],
  templateUrl: './target-list.component.html',
  host: { class: 'block' },
})
export class TargetListComponent {
  targets = input.required<readonly TargetView[]>();

  siteTypeLabels = SITE_TYPE_LABELS;
  verdictLabels = VERDICT_LABELS;
  verdictTones = VERDICT_TONES;

  selectedTarget = output<number>();

  strategyMark = $localize`:@@uiSonar-targetList-strategyChoice:Strategie wählt dieses Ziel`;

  onSelect(index: number): void {
    this.selectedTarget.emit(index);
  }
}
