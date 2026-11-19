import { Component, input, output, signal } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import { STRATEGY_IDS, type StrategyId } from '@app/site/domain/models/auto-move.model';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { CurrentSiteView, TravelView } from '../models/site-status.model';
import { STRATEGY_LABELS } from '../sonar-labels/sonar-labels';

/**
 * Titel des Kartenmodus (Mockup K2-K `.top.only-map`): Reichweite, Standort bzw. Reise mit Vorrat
 * oder Ankunft, Strategie-Umschalter (US-04.10) und Legende der Sonar-Karte.
 */
@Component({
  selector: 'app-sonar-title',
  imports: [FormatDownPipe, FormatDurationPipe, FormatNumPipe, FormatUpPipe],
  templateUrl: './sonar-title.component.html',
  host: { class: 'block' },
})
export class SonarTitleComponent {
  range = input.required<number>();
  site = input.required<CurrentSiteView>();
  /** `null`, solange der Schwarm nicht unterwegs ist. */
  travel = input.required<TravelView | null>();
  strategy = input.required<StrategyId>();
  /** Index des Strategieziels; `null`, wenn die Strategie keines findet oder während der Reise. */
  strategyTarget = input.required<number | null>();

  strategies = STRATEGY_IDS;
  strategyLabels = STRATEGY_LABELS;
  siteTypeLabels = SITE_TYPE_LABELS;

  changedStrategy = output<StrategyId>();

  /** Legende auf dem Smartphone aufgeklappt; lokaler UI-Zustand, auf größeren Bildschirmen immer offen. */
  legendOpen = signal(false);

  strategyGroupLabel = $localize`:@@uiSonar-sonarTitle-strategyGroup:Strategie`;

  onToggleLegend(): void {
    this.legendOpen.update((open) => !open);
  }

  onSelectStrategy(strategy: StrategyId): void {
    if (strategy !== this.strategy()) {
      this.changedStrategy.emit(strategy);
    }
  }
}
