import { Component, computed, input } from '@angular/core';

import { FIND_ENTRY_LABELS } from '@app/finds/ui/finds-labels/finds-labels';
import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatDurationPipe } from '@app/shared/ui/pipes/format-duration/format-duration.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatUpPipe } from '@app/shared/ui/pipes/format-up/format-up.pipe';
import { SITE_TYPE_LABELS } from '@app/site/ui/site-type-labels/site-type-labels';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import type { ReturnSummaryView } from './dialog-return-summary.component.model';

/**
 * Inhalt des Dialogs „Willkommen zurück“ (US-07.03): nachgeholte Dauer (bei Deckelung mit dem
 * verfallenen Rest), Nahrung und DNA, geschlüpfte und verlorene Einheiten, Weiterzüge mit den
 * erreichten Futterstellen und Funde. „Weiter“ steht in der Fußleiste
 * (`DialogReturnSummaryActionsComponent`).
 */
@Component({
  selector: 'app-dialog-return-summary',
  imports: [FormatDownPipe, FormatDurationPipe, FormatNumPipe, FormatUpPipe],
  templateUrl: './dialog-return-summary.component.html',
  host: { class: 'block' },
})
export class DialogReturnSummaryComponent {
  summary = input.required<ReturnSummaryView>();

  hatched = computed(() =>
    this.summary().hatched.map((row) => ({ ...row, name: this.#unitNames[row.unit] })),
  );
  lost = computed(() =>
    this.summary().lost.map((row) => ({ ...row, name: this.#unitNames[row.unit] })),
  );
  arrivals = computed(() =>
    this.summary().arrivals.map((row) => ({ ...row, name: SITE_TYPE_LABELS[row.siteType] })),
  );
  finds = computed(() =>
    this.summary().finds.map((row) => ({ ...row, name: FIND_ENTRY_LABELS[row.entry] })),
  );

  readonly #unitNames: Readonly<Record<UnitType, string>> = {
    queens: $localize`:@@uiHud-dialogReturnSummary-unit-queens:Königinnen`,
    drones: $localize`:@@uiHud-dialogReturnSummary-unit-drones:Drohnen`,
    soldiers: $localize`:@@uiHud-dialogReturnSummary-unit-soldiers:Soldaten`,
  };
}
