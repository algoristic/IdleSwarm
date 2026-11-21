import { Component, output } from '@angular/core';

/** Fußleiste des Dialogs „Willkommen zurück“ (US-07.03): „Weiter“ quittiert. */
@Component({
  selector: 'app-dialog-return-summary-actions',
  templateUrl: './dialog-return-summary-actions.component.html',
  host: { class: 'grid' },
})
export class DialogReturnSummaryActionsComponent {
  clickedContinue = output<void>();

  onContinue(): void {
    this.clickedContinue.emit();
  }
}
