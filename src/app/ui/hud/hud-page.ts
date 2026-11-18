import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DEFAULT_BALANCE } from '../../core/balance/constants';
import {
  baseFoodPerSecond,
  droneFoodPerSecond,
  eggsPerMinute,
  foodPerSecond,
  isSpaceWarning,
  spaceAvailable,
  spaceUsage,
  spaceUsed,
  totalAttack,
} from '../../core/balance/formulas';
import { TEXTS_DE } from '../../core/data/texts.de';
import type { UnitType } from '../../core/data/units';
import { formatNum, formatRate } from '../../core/num/format';
import { GameStoreService } from '../../game/game-store.service';
import { PersistenceService } from '../../game/persistence.service';
import { BuyButton } from './buy-button';
import { FeedingSite } from './feeding-site';
import { barPercent, fillText, formatDown, roundDownForDisplay } from './hud-format';
import { HudMeter } from './hud-meter';

const SAVED_AT_FORMAT = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

/** Reihenfolge der Aktionsleiste, vom ersten Kauf zur teuersten Einheit. */
const BUY_ORDER: readonly UnitType[] = ['drones', 'soldiers', 'queens'];

/** Funktionales Prototyp-HUD: Ressourcen, Futterstelle, Käufe, Platz und Speicherstatus. */
@Component({
  selector: 'app-hud-page',
  templateUrl: './hud-page.html',
  styleUrl: './hud-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BuyButton, FeedingSite, HudMeter],
})
export class HudPage {
  private readonly store = inject(GameStoreService);
  private readonly persistence = inject(PersistenceService);

  protected readonly texts = TEXTS_DE;
  protected readonly buyOrder = BUY_ORDER;

  protected readonly food = computed(() => formatDown(this.store.state().res.food));
  protected readonly foodRate = computed(() => {
    const { units, site } = this.store.state();
    return formatRate(foodPerSecond(units, site.stock, DEFAULT_BALANCE));
  });
  protected readonly baseRate = computed(() =>
    formatRate(baseFoodPerSecond(this.store.state().site.stock, DEFAULT_BALANCE)),
  );
  protected readonly droneRate = computed(() => {
    const { units, site } = this.store.state();
    return formatRate(droneFoodPerSecond(units, site.stock, DEFAULT_BALANCE));
  });
  protected readonly eggs = computed(() =>
    formatRate(eggsPerMinute(this.store.state().units, DEFAULT_BALANCE)),
  );
  protected readonly attack = computed(() =>
    formatDown(totalAttack(this.store.state().units, DEFAULT_BALANCE)),
  );

  private readonly usage = computed(() => spaceUsage(this.store.state().units, DEFAULT_BALANCE));

  protected readonly spaceText = computed(() => {
    const { units } = this.store.state();
    return fillText(TEXTS_DE['hud.space.value'], {
      used: formatDown(spaceUsed(units, DEFAULT_BALANCE)),
      available: formatDown(spaceAvailable(units, DEFAULT_BALANCE)),
    });
  });

  /** Echter Wert, auch über 100 %; ohne verfügbaren Platz gibt es keinen. */
  protected readonly spacePercentText = computed(() => {
    const usage = this.usage();
    return usage === null
      ? null
      : fillText(TEXTS_DE['hud.space.percent'], {
          percent: formatNum(roundDownForDisplay(usage.mul(100))),
        });
  });

  protected readonly spaceBar = computed(() => {
    const usage = this.usage();
    if (usage !== null) {
      return barPercent(usage);
    }
    // Ohne verfügbaren Platz ist jede belegte Einheit schon zu viel.
    return spaceUsed(this.store.state().units, DEFAULT_BALANCE).isZero() ? 0 : 100;
  });

  protected readonly spaceWarning = computed(() =>
    isSpaceWarning(this.store.state().units, DEFAULT_BALANCE),
  );

  protected readonly lastSaved = computed(() => {
    const savedAt = this.persistence.lastSavedAt();
    // Ein Spielstand kann Zeitwerte jenseits des Date-Bereichs enthalten.
    const date = savedAt === null ? null : new Date(savedAt);
    return date === null || Number.isNaN(date.getTime())
      ? null
      : { iso: date.toISOString(), label: SAVED_AT_FORMAT.format(date) };
  });

  protected readonly notices = computed(() => {
    const notices: string[] = [];
    const notice = this.persistence.notice();
    if (notice === 'restored-from-backup') {
      notices.push(TEXTS_DE['status.notice.restoredFromBackup']);
    } else if (notice === 'save-unreadable') {
      notices.push(TEXTS_DE['status.notice.saveUnreadable']);
    }
    if (this.persistence.lastSaveError() !== null) {
      notices.push(TEXTS_DE['status.notice.saveFailed']);
    }
    return notices;
  });
}
