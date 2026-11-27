import { Component, computed, inject } from '@angular/core';

import { BottomSheetComponent } from '@app/shared/ui/bottom-sheet/bottom-sheet.component';

import { GameFacade } from '../state/game.facade';

@Component({
  selector: 'app-swarm-page',
  imports: [BottomSheetComponent],
  templateUrl: './swarm.page.html',
  host: { class: 'contents' },
})
export class SwarmPage {
  facade = inject(GameFacade);

  collapsed = computed(() => this.facade.collapsedSheets().swarm);

  label = $localize`:@@featureGame-swarm-sheet-label:Kette`;

  onChangedCollapsed(collapsed: boolean): void {
    this.facade.setSheetCollapsed('swarm', collapsed);
  }
}
