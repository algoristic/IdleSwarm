import { Component, inject, output } from '@angular/core';

import { ModalDialogComponent } from '@app/shared/ui/modal-dialog/modal-dialog.component';

import { DialogReturnSummaryComponent } from '../../ui/dialog-return-summary/dialog-return-summary.component';
import { DialogReturnSummaryActionsComponent } from '../../ui/dialog-return-summary-actions/dialog-return-summary-actions.component';
import { HudFacade } from '../state/hud.facade';

/**
 * Dialog „Willkommen zurück“ (US-07.03): erscheint in allen Modi, sobald ein Nachholen ab 5 min
 * Abwesenheit vorliegt; „Weiter“, Esc und Schließen quittieren es. Danach meldet es
 * `acknowledgedSummary`, damit die Shell den Fokus auf den Titel des Modus setzt: Der Dialog
 * verschwindet aus dem DOM, und ohne vorher fokussiertes Element läge der Fokus sonst auf `body`.
 */
@Component({
  selector: 'app-return-summary',
  imports: [
    DialogReturnSummaryActionsComponent,
    DialogReturnSummaryComponent,
    ModalDialogComponent,
  ],
  templateUrl: './return-summary.component.html',
  host: { class: 'contents' },
})
export class ReturnSummaryComponent {
  facade = inject(HudFacade);

  acknowledgedSummary = output<void>();

  heading = $localize`:@@featureHud-returnSummary-heading:Willkommen zurück`;

  onAcknowledge(): void {
    this.facade.acknowledgeReturnSummary();
    this.acknowledgedSummary.emit();
  }
}
