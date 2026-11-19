import { Component, inject } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import { FormMoveSettingsComponent } from '../../ui/form-move-settings/form-move-settings.component';
import { STRATEGY_LABELS } from '../../ui/sonar-labels/sonar-labels';
import { TargetDetailComponent } from '../../ui/target-detail/target-detail.component';
import { TargetListComponent } from '../../ui/target-list/target-list.component';
import { SonarFacade } from '../state/sonar.facade';

/**
 * Overlay des Kartenmodus: Standort bzw. Reise, Zielliste als tippbare Alternative zur Karte,
 * Detailpanel und Einstellungen.
 */
@Component({
  selector: 'app-sonar-overlay',
  imports: [
    FormatDownPipe,
    FormatDurationPipe,
    FormatNumPipe,
    FormatUpPipe,
    FormMoveSettingsComponent,
    TargetDetailComponent,
    TargetListComponent,
  ],
  templateUrl: './sonar-overlay.component.html',
  host: { class: 'block' },
})
export class SonarOverlayComponent {
  facade = inject(SonarFacade);

  siteTypeLabels = SITE_TYPE_LABELS;
  strategyLabels = STRATEGY_LABELS;
}
