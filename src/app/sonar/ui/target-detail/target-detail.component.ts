import { Component, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import type { Num } from '@app/shared/util/num/num';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { QueenConversionView, TargetView, TransportView } from '../models/target.model';
import {
  BLOCKER_LABELS,
  PRIORITY_LABELS,
  VERDICT_LABELS,
  VERDICT_TONES,
} from '../sonar-labels/sonar-labels';

/**
 * Detailpanel eines Ziels: Werte, Angriff vs. Abwehr, Urteil, erwartete Verluste, Transportvorschau,
 * Drohnen → Königin und Aufbruch mit Grund, falls er nicht möglich ist (US-04.01–04.09).
 */
@Component({
  selector: 'app-target-detail',
  imports: [FormatDownPipe, FormatDurationPipe, FormatNumPipe, FormatRatePipe, FormatUpPipe],
  templateUrl: './target-detail.component.html',
  host: { class: 'block' },
})
export class TargetDetailComponent {
  target = input.required<TargetView>();
  transport = input.required<TransportView>();
  queen = input.required<QueenConversionView>();
  /** Restvorrat, der beim Aufbruch verfällt; `null` ohne Rest oder während der Reise. */
  forfeitedStock = input.required<Num | null>();

  siteTypeLabels = SITE_TYPE_LABELS;
  verdictLabels = VERDICT_LABELS;
  verdictTones = VERDICT_TONES;
  blockerLabels = BLOCKER_LABELS;
  priorityLabels = PRIORITY_LABELS;

  clickedDepart = output<number>();
  clickedConvertDronesToQueen = output();

  attackLabel = $localize`:@@uiSonar-targetDetail-attack:Angriff`;
  defenseLabel = $localize`:@@uiSonar-targetDetail-defense:Abwehr`;

  onDepart(): void {
    this.clickedDepart.emit(this.target().index);
  }

  onConvertDronesToQueen(): void {
    this.clickedConvertDronesToQueen.emit();
  }
}
