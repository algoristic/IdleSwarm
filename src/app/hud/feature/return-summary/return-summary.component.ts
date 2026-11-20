import { Component, inject } from '@angular/core';

import { ModalDialogComponent } from '@app/shared/ui/modal-dialog/modal-dialog.component';

import { DialogReturnSummaryComponent } from '../../ui/dialog-return-summary/dialog-return-summary.component';
import { HudFacade } from '../state/hud.facade';

/**
 * Dialog „Willkommen zurück“ (US-07.03): erscheint in allen Modi, sobald ein Nachholen ab 5 min
 * Abwesenheit vorliegt; „Weiter“, Esc und Schließen quittieren es.
 */
@Component({
  selector: 'app-return-summary',
  imports: [DialogReturnSummaryComponent, ModalDialogComponent],
  templateUrl: './return-summary.component.html',
  host: { class: 'contents' },
})
export class ReturnSummaryComponent {
  facade = inject(HudFacade);

  heading = $localize`:@@featureHud-returnSummary-heading:Willkommen zurück`;
}
