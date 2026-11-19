import { Component, computed, input, output } from '@angular/core';

import { FormatDownPipe } from '@app/shared/ui/pipes/format-down/format-down.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';
import { FormatRatePipe } from '@app/shared/ui/pipes/format-rate/format-rate.pipe';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import type { UnitView } from './buy-button.component.model';

/**
 * Kaufknopf einer Einheit in der Aktionsleiste: Symbol, Anzahl, Name, Preis und bei der Königin ihr
 * Effekt.
 */
@Component({
  selector: 'app-buy-button',
  imports: [FormatDownPipe, FormatNumPipe, FormatRatePipe],
  templateUrl: './buy-button.component.html',
  host: { class: 'block' },
})
export class BuyButtonComponent {
  unit = input.required<UnitView>();

  clickedBuy = output<UnitType>();

  name = computed(() => this.#names[this.unit().id]);

  readonly #names: Readonly<Record<UnitType, string>> = {
    queens: $localize`:@@uiHud-buyButton-name-queens:Königin`,
    drones: $localize`:@@uiHud-buyButton-name-drones:Drohne`,
    soldiers: $localize`:@@uiHud-buyButton-name-soldiers:Soldat`,
  };

  onClick(): void {
    this.clickedBuy.emit(this.unit().id);
  }
}
