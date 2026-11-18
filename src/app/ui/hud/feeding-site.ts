import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';

import { DEFAULT_BALANCE } from '../../core/balance/constants';
import { foodPerSecond, siteSecondsLeft } from '../../core/balance/formulas';
import { TEXTS_DE } from '../../core/data/texts.de';
import { formatRate } from '../../core/num/format';
import { GameStoreService } from '../../game/game-store.service';
import { barPercent, fillText, formatDown, formatDuration, formatUp } from './hud-format';
import { HudMeter } from './hud-meter';

/** Futterstelle: Nahrungsrate, Vorrat, Restzeit und Erneuern bei leerem Vorrat. */
@Component({
  selector: 'app-feeding-site',
  templateUrl: './feeding-site.html',
  styleUrl: './feeding-site.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HudMeter],
})
export class FeedingSite {
  private readonly store = inject(GameStoreService);
  private readonly title = viewChild.required<ElementRef<HTMLHeadingElement>>('title');

  protected readonly texts = TEXTS_DE;

  private readonly site = computed(() => this.store.state().site);

  protected readonly empty = computed(() => this.site().stock.isZero());

  /** Gesamtrate aus Grundertrag und Drohnen (US-01.02). */
  protected readonly rate = computed(() => {
    const { units, site } = this.store.state();
    return fillText(TEXTS_DE['hud.site.rate'], {
      rate: formatRate(foodPerSecond(units, site.stock, DEFAULT_BALANCE)),
    });
  });

  /** Aufgerundet, damit ein Rest nie als `0` neben einer scheinbar leeren Futterstelle steht. */
  protected readonly stockText = computed(() => {
    const { stock, size } = this.site();
    return `${formatUp(stock)} / ${formatDown(size)}`;
  });

  protected readonly stockPercent = computed(() => {
    const { stock, size } = this.site();
    return size.isZero() ? 0 : barPercent(stock.div(size));
  });

  protected readonly timeLeft = computed(() => {
    const { units, site } = this.store.state();
    const seconds = siteSecondsLeft(units, site.stock, DEFAULT_BALANCE);
    return seconds === null
      ? TEXTS_DE['hud.site.noRate']
      : fillText(TEXTS_DE['hud.site.timeLeft'], { time: formatDuration(seconds) });
  });

  protected renew(): void {
    this.store.dispatch({ type: 'newSite' });
    // Der Knopf verschwindet gleich; der Fokus darf nicht mit ihm verloren gehen.
    this.title().nativeElement.focus();
  }
}
