import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';

import { DEFAULT_BALANCE } from '../../core/balance/constants';
import { nextQueenEffect, unitPrice } from '../../core/balance/formulas';
import { TEXTS_DE } from '../../core/data/texts.de';
import type { UnitType } from '../../core/data/units';
import { formatNum, formatRate } from '../../core/num/format';
import { canBuy } from '../../core/rules/units';
import { GameStoreService } from '../../game/game-store.service';
import { fillText, formatDown, roundDownForDisplay, roundUpForDisplay } from './hud-format';

const UNIT_NAMES = {
  queens: TEXTS_DE['hud.unit.queens'],
  drones: TEXTS_DE['hud.unit.drones'],
  soldiers: TEXTS_DE['hud.unit.soldiers'],
} as const satisfies Record<UnitType, string>;

/** Kaufknopf einer Einheit mit Name, Anzahl und Preis. */
@Component({
  selector: 'app-buy-button',
  templateUrl: './buy-button.html',
  styleUrl: './buy-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BuyButton {
  private readonly store = inject(GameStoreService);

  readonly unit = input.required<UnitType>();

  protected readonly name = computed(() => UNIT_NAMES[this.unit()]);
  protected readonly affordable = computed(() => canBuy(this.store.state(), this.unit()));

  protected readonly count = computed(() =>
    fillText(TEXTS_DE['hud.buy.count'], {
      count: formatDown(this.store.state().units[this.unit()]),
    }),
  );

  protected readonly price = computed(() => {
    const state = this.store.state();
    const rounded = roundUpForDisplay(unitPrice(this.unit(), state.bought, DEFAULT_BALANCE));
    // Aufgerundet verlangte ein kaufbarer Knopf bei 10,8 Nahrung und Preis 10,7 sichtbar 11 von 10.
    const shown = this.affordable() ? rounded.min(roundDownForDisplay(state.res.food)) : rounded;
    return fillText(TEXTS_DE['hud.buy.price'], { price: formatNum(shown) });
  });

  protected readonly effect = computed(() => {
    if (this.unit() !== 'queens') {
      return null;
    }
    const { eggsPerMin, space } = nextQueenEffect(DEFAULT_BALANCE);
    return fillText(TEXTS_DE['hud.buy.queenEffect'], {
      eggs: formatRate(eggsPerMin),
      space: formatNum(space),
    });
  });

  protected buy(): void {
    this.store.dispatch({ type: 'buy', unit: this.unit() });
  }
}
