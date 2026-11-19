import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

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

/** Umgebung (Prototyp bis zur Sonar-Karte, AP 1.2.8): Ziele, Detailpanel und Einstellungen. */
@Component({
  selector: 'app-sonar-page',
  imports: [
    FormatDownPipe,
    FormatDurationPipe,
    FormatNumPipe,
    FormatUpPipe,
    FormMoveSettingsComponent,
    RouterLink,
    TargetDetailComponent,
    TargetListComponent,
  ],
  templateUrl: './sonar.page.html',
  host: { class: 'block' },
})
export class SonarPage {
  facade = inject(SonarFacade);

  siteTypeLabels = SITE_TYPE_LABELS;
  strategyLabels = STRATEGY_LABELS;
}
