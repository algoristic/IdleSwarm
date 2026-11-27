import { Component, inject } from '@angular/core';

import { ButtonDirective } from '@app/shared/ui/button/button.directive';
import { DialogActionsDirective } from '@app/shared/ui/dialog-actions/dialog-actions.directive';
import { DialogFrameComponent } from '@app/shared/ui/dialog-frame/dialog-frame.component';
import { DialogTitleDirective } from '@app/shared/ui/dialog-title/dialog-title.directive';

import { GameFacade } from '../state/game.facade';

@Component({
  selector: 'app-dialog-menu',
  imports: [ButtonDirective, DialogActionsDirective, DialogFrameComponent, DialogTitleDirective],
  templateUrl: './dialog-menu.component.html',
  host: { class: 'contents' },
})
export class DialogMenuComponent {
  facade = inject(GameFacade);

  label = $localize`:@@featureGame-dialogMenu-label:Menü`;

  close(): void {
    this.facade.closeMenu();
  }
}
