import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';

import { DEFAULT_BALANCE } from '../../core/balance/constants';
import { clickGain, siteSecondsLeft } from '../../core/balance/formulas';
import { TEXTS_DE } from '../../core/data/texts.de';
import { Num } from '../../core/num/num';
import { GameStoreService } from '../../game/game-store.service';
import {
  barPercent,
  fillText,
  formatDown,
  formatDuration,
  formatGain,
  formatUp,
} from './hud-format';
import { HudMeter } from './hud-meter';

/** Mehr gleichzeitige Zahlen wären bei schnellem Klicken nicht mehr lesbar. */
const MAX_FLOATING_GAINS = 12;

interface FloatingGain {
  readonly id: number;
  readonly text: string;
  readonly left: string;
  readonly top: string;
}

/** Futterstelle: Klickfläche, Vorrat, Restzeit und Erneuern bei leerem Vorrat. */
@Component({
  selector: 'app-feeding-site',
  templateUrl: './feeding-site.html',
  styleUrl: './feeding-site.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HudMeter],
})
export class FeedingSite {
  private readonly store = inject(GameStoreService);
  private readonly siteButton = viewChild.required<ElementRef<HTMLButtonElement>>('siteButton');
  private nextGainId = 0;

  protected readonly texts = TEXTS_DE;
  protected readonly floatingGains = signal<readonly FloatingGain[]>([]);

  private readonly site = computed(() => this.store.state().site);

  protected readonly empty = computed(() => this.site().stock.isZero());

  protected readonly clickYield = computed(() =>
    fillText(TEXTS_DE['hud.site.clickYield'], {
      gain: formatGain(clickGain(this.site().stock, DEFAULT_BALANCE)),
    }),
  );

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
      ? TEXTS_DE['hud.site.noDrones']
      : fillText(TEXTS_DE['hud.site.timeLeft'], { time: formatDuration(seconds) });
  });

  protected collect(event: MouseEvent): void {
    const gain = clickGain(this.site().stock, DEFAULT_BALANCE);
    this.store.dispatch({ type: 'click' });
    if (gain.gt(Num.ZERO)) {
      this.showGain(gain, event);
    }
  }

  protected renew(): void {
    this.store.dispatch({ type: 'newSite' });
    // Der Knopf verschwindet gleich; der Fokus darf nicht mit ihm verloren gehen.
    this.siteButton().nativeElement.focus();
  }

  protected removeGain(id: number): void {
    this.floatingGains.update((gains) => gains.filter((gain) => gain.id !== id));
  }

  private showGain(gain: Num, event: MouseEvent): void {
    const gainView: FloatingGain = {
      id: this.nextGainId++,
      text: `+${formatGain(gain)}`,
      ...this.gainPosition(event),
    };
    this.floatingGains.update((gains) => [...gains, gainView].slice(-MAX_FLOATING_GAINS));
  }

  /** Tastatur-Klicks haben `detail === 0` und keinen Klickpunkt. */
  private gainPosition(event: MouseEvent): Pick<FloatingGain, 'left' | 'top'> {
    if (event.detail === 0) {
      return { left: '50%', top: '50%' };
    }
    const rect = this.siteButton().nativeElement.getBoundingClientRect();
    return { left: `${event.clientX - rect.left}px`, top: `${event.clientY - rect.top}px` };
  }
}
