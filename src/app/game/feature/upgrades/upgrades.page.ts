import { Component, computed, inject } from '@angular/core';

import { BottomSheetComponent } from '@app/shared/ui/bottom-sheet/bottom-sheet.component';

import { GameFacade } from '../state/game.facade';

@Component({
  selector: 'app-upgrades-page',
  imports: [BottomSheetComponent],
  templateUrl: './upgrades.page.html',
  host: { class: 'contents' },
})
export class UpgradesPage {
  facade = inject(GameFacade);

  collapsed = computed(() => this.facade.collapsedSheets().upgrades);

  label = $localize`:@@featureGame-upgrades-sheet-label:Ausbau`;

  onChangedCollapsed(collapsed: boolean): void {
    this.facade.setSheetCollapsed('upgrades', collapsed);
  }
}
