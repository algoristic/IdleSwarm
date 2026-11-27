import { Component, computed, inject } from '@angular/core';

import { BottomSheetComponent } from '@app/shared/ui/bottom-sheet/bottom-sheet.component';

import { GameFacade } from '../state/game.facade';

@Component({
  selector: 'app-map-page',
  imports: [BottomSheetComponent],
  templateUrl: './map.page.html',
  host: { class: 'contents' },
})
export class MapPage {
  facade = inject(GameFacade);

  collapsed = computed(() => this.facade.collapsedSheets().map);

  label = $localize`:@@featureGame-map-sheet-label:Ziele`;

  onChangedCollapsed(collapsed: boolean): void {
    this.facade.setSheetCollapsed('map', collapsed);
  }
}
