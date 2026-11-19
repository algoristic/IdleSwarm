import { Component, input } from '@angular/core';

import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';

import type { MoveSettingsView } from '../form-move-settings/form-move-settings.component.model';
import type { CurrentSiteView, TravelView } from '../models/site-status.model';
import { STRATEGY_LABELS } from '../sonar-labels/sonar-labels';

/**
 * Notiz unter dem Detailpanel (Mockup K2-K `.note`): wo der Schwarm steht und was ohne
 * Entscheidung passiert, je nach Auto-Weiterziehen (US-04.11); während der Reise der Hinweis auf
 * neue Ziele.
 */
@Component({
  selector: 'app-move-note',
  imports: [FormatDurationPipe, FormatNumPipe],
  templateUrl: './move-note.component.html',
  host: { class: 'block' },
})
export class MoveNoteComponent {
  site = input.required<CurrentSiteView>();
  /** `null`, solange der Schwarm nicht unterwegs ist. */
  travel = input.required<TravelView | null>();
  settings = input.required<MoveSettingsView>();

  siteTypeLabels = SITE_TYPE_LABELS;
  strategyLabels = STRATEGY_LABELS;
}
