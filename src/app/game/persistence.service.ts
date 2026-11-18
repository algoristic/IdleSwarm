import { DestroyRef, DOCUMENT, inject, Injectable, InjectionToken, signal } from '@angular/core';

import { SaveError } from '../core/save/serialize';
import { KeyValueStore, loadGame, LoadResult, saveGame } from '../core/save/slots';
import { syncClock } from '../core/sim/step';
import { GameState } from '../core/state/game-state';
import { createNewGame, GameStoreService } from './game-store.service';

/** Abstand des Autosaves; einstellbar wird er in AP 1.5.3. */
export const AUTOSAVE_INTERVAL_MS = 30_000;

export type RestoreNotice = 'restored-from-backup' | 'save-unreadable';

/** Greift bei jedem Aufruf neu zu, denn schon der Zugriff auf `localStorage` kann werfen. */
export const KEY_VALUE_STORE = new InjectionToken<KeyValueStore>('KEY_VALUE_STORE', {
  providedIn: 'root',
  factory: () => ({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  }),
});

/** Lädt den Spielstand beim Start und speichert ihn automatisch. */
@Injectable({ providedIn: 'root' })
export class PersistenceService {
  private readonly store = inject(GameStoreService);
  private readonly keyValueStore = inject(KEY_VALUE_STORE);
  private readonly document = inject(DOCUMENT);

  private readonly noticeState = signal<RestoreNotice | null>(null);
  private readonly lastSaveErrorState = signal<SaveError | null>(null);
  private readonly lastSavedAtState = signal<number | null>(null);

  private timer: ReturnType<typeof setInterval> | null = null;
  private lastWritten: GameState | null = null;
  /** Der Speicher war beim Laden nicht lesbar; ein echter Stand kann dort noch liegen. */
  private loadIncomplete = false;

  /** Hinweis aus dem letzten {@link restore}. */
  readonly notice = this.noticeState.asReadonly();
  /** Fehler des letzten Speicherversuchs; `null`, sobald wieder gespeichert wurde. */
  readonly lastSaveError = this.lastSaveErrorState.asReadonly();
  /** Zeitpunkt des letzten erfolgreichen Speicherns; `null` bei einem nie gespeicherten Spiel. */
  readonly lastSavedAt = this.lastSavedAtState.asReadonly();

  private readonly onVisibilityChange = (): void => {
    if (this.document.hidden) {
      this.save();
    }
  };

  private readonly onPageHide = (): void => {
    this.save();
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopAutosave());
  }

  /** Übernimmt den gespeicherten Stand oder beginnt ein neues Spiel. */
  restore(): LoadResult['status'] {
    const result = loadGame(this.keyValueStore);
    this.lastWritten = null;
    this.loadIncomplete = storageError(result) !== null;
    this.lastSaveErrorState.set(null);
    if (result.status === 'loaded' || result.status === 'restored-from-backup') {
      this.adopt(result.state);
    } else {
      this.store.replace(createNewGame(Date.now()));
      this.lastSavedAtState.set(null);
    }
    this.noticeState.set(toNotice(result.status));
    return result.status;
  }

  /** Speichert sofort und synchron; ein Fehler landet in {@link lastSaveError}. */
  save(): boolean {
    if (this.loadIncomplete) {
      const outcome = this.retryLoad();
      if (outcome !== 'continue') {
        return outcome === 'adopted';
      }
    }
    const state = this.store.state();
    // Beim Verlassen folgen oft zwei Ereignisse; ein zweites Schreiben verdrängte das Backup.
    if (state === this.lastWritten) {
      return true;
    }
    const now = Date.now();
    const result = saveGame(this.keyValueStore, state, now);
    if (!result.ok) {
      this.lastSaveErrorState.set(result.error);
      return false;
    }
    this.store.replace(result.state);
    this.lastWritten = result.state;
    this.lastSavedAtState.set(now);
    this.lastSaveErrorState.set(null);
    return true;
  }

  /**
   * Holt ein beim Start gescheitertes Laden nach, bevor geschrieben wird. Sonst verdrängte das
   * provisorische Spiel den echten Stand aus dem Primär-Slot und später aus dem Backup.
   */
  private retryLoad(): 'blocked' | 'adopted' | 'continue' {
    const result = loadGame(this.keyValueStore);
    const error = storageError(result);
    if (error !== null) {
      this.lastSaveErrorState.set(error);
      return 'blocked';
    }
    this.loadIncomplete = false;
    switch (result.status) {
      case 'loaded':
      case 'restored-from-backup':
        this.adopt(result.state);
        this.noticeState.set(toNotice(result.status));
        this.lastSaveErrorState.set(null);
        return 'adopted';
      case 'empty':
        this.noticeState.set(null);
        return 'continue';
      case 'failed':
        return 'continue';
    }
  }

  private adopt(state: GameState): void {
    this.store.replace(syncClock(state, Date.now()));
    this.lastSavedAtState.set(state.time.lastSaved);
  }

  startAutosave(): void {
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => this.save(), AUTOSAVE_INTERVAL_MS);
    this.document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.document.defaultView?.addEventListener('pagehide', this.onPageHide);
  }

  stopAutosave(): void {
    if (this.timer === null) {
      return;
    }
    clearInterval(this.timer);
    this.timer = null;
    this.document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.document.defaultView?.removeEventListener('pagehide', this.onPageHide);
  }
}

function storageError(result: LoadResult): SaveError | null {
  return 'error' in result && result.error.code === 'storage' ? result.error : null;
}

function toNotice(status: LoadResult['status']): RestoreNotice | null {
  switch (status) {
    case 'restored-from-backup':
      return 'restored-from-backup';
    case 'failed':
      return 'save-unreadable';
    default:
      return null;
  }
}
