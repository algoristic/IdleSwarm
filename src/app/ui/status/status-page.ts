import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { TEXTS_DE } from '../../core/data/texts.de';
import { formatNum, formatRate } from '../../core/num/format';
import { GameStoreService } from '../../game/game-store.service';
import { PersistenceService } from '../../game/persistence.service';

const SAVED_AT_FORMAT = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

/** Schlichter Nachweis, dass der Spielzustand tickt, gespeichert und geladen wird. */
@Component({
  selector: 'app-status-page',
  templateUrl: './status-page.html',
  styleUrl: './status-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatusPage {
  private readonly store = inject(GameStoreService);
  private readonly persistence = inject(PersistenceService);

  protected readonly texts = TEXTS_DE;

  protected readonly playedSeconds = computed(() =>
    formatRate(this.store.state().time.played / 1000),
  );
  protected readonly food = computed(() => formatNum(this.store.state().res.food));

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
