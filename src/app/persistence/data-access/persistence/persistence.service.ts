import { DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';

import { createNewGame, GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { syncClock } from '@app/engine/domain/step-logic';
import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import { SaveError } from '../../domain/serialize-logic';
import { loadGame, LoadResult, saveGame } from '../../domain/slots-logic';
import type { RestoreNotice } from './persistence-service.model';
import { KEY_VALUE_STORE } from './persistence-service.tokens';

/** Abstand des Autosaves; einstellbar wird er in AP 1.5.3. */
export const AUTOSAVE_INTERVAL_MS = 30_000;

/** Lädt den Spielstand beim Start und speichert ihn automatisch. */
@Injectable()
export class PersistenceService {
  readonly #store = inject(GameStore);
  readonly #keyValueStore = inject(KEY_VALUE_STORE);
  readonly #document = inject(DOCUMENT);
  readonly #clock = inject(CLOCK);

  readonly #noticeState = signal<RestoreNotice | null>(null);
  readonly #lastSaveErrorState = signal<SaveError | null>(null);
  readonly #lastSavedAtState = signal<number | null>(null);

  #timer: ReturnType<typeof setInterval> | null = null;
  #lastWritten: GameState | null = null;
  /** Der Speicher war beim Laden nicht lesbar; ein echter Stand kann dort noch liegen. */
  #loadIncomplete = false;

  /** Hinweis aus dem letzten {@link restore}. */
  notice = this.#noticeState.asReadonly();
  /** Fehler des letzten Speicherversuchs; `null`, sobald wieder gespeichert wurde. */
  lastSaveError = this.#lastSaveErrorState.asReadonly();
  /** Zeitpunkt des letzten erfolgreichen Speicherns; `null` bei einem nie gespeicherten Spiel. */
  lastSavedAt = this.#lastSavedAtState.asReadonly();

  readonly #onVisibilityChange = (): void => {
    if (this.#document.hidden) {
      this.save();
    }
  };

  readonly #onPageHide = (): void => {
    this.save();
  };

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopAutosave());
  }

  /** Übernimmt den gespeicherten Stand oder beginnt ein neues Spiel. */
  restore(): LoadResult['status'] {
    const result = loadGame(this.#keyValueStore);
    this.#lastWritten = null;
    this.#loadIncomplete = storageError(result) !== null;
    this.#lastSaveErrorState.set(null);
    if (result.status === 'loaded' || result.status === 'restored-from-backup') {
      this.#adopt(result.state);
    } else {
      this.#store.replace(createNewGame(this.#clock.now()));
      this.#lastSavedAtState.set(null);
    }
    this.#noticeState.set(toNotice(result.status));
    return result.status;
  }

  /** Speichert sofort und synchron; ein Fehler landet in {@link lastSaveError}. */
  save(): boolean {
    if (this.#loadIncomplete) {
      const outcome = this.#retryLoad();
      if (outcome !== 'continue') {
        return outcome === 'adopted';
      }
    }
    const state = this.#store.state();
    // Beim Verlassen folgen oft zwei Ereignisse; ein zweites Schreiben verdrängte das Backup.
    if (state === this.#lastWritten) {
      return true;
    }
    const now = this.#clock.now();
    const result = saveGame(this.#keyValueStore, state, now);
    if (!result.ok) {
      this.#lastSaveErrorState.set(result.error);
      return false;
    }
    this.#store.replace(result.state);
    this.#lastWritten = result.state;
    this.#lastSavedAtState.set(now);
    this.#lastSaveErrorState.set(null);
    return true;
  }

  /**
   * Holt ein beim Start gescheitertes Laden nach, bevor geschrieben wird. Sonst verdrängte das
   * provisorische Spiel den echten Stand aus dem Primär-Slot und später aus dem Backup.
   */
  #retryLoad(): 'blocked' | 'adopted' | 'continue' {
    const result = loadGame(this.#keyValueStore);
    const error = storageError(result);
    if (error !== null) {
      this.#lastSaveErrorState.set(error);
      return 'blocked';
    }
    this.#loadIncomplete = false;
    switch (result.status) {
      case 'loaded':
      case 'restored-from-backup':
        this.#adopt(result.state);
        this.#noticeState.set(toNotice(result.status));
        this.#lastSaveErrorState.set(null);
        return 'adopted';
      case 'empty':
        this.#noticeState.set(null);
        return 'continue';
      case 'failed':
        return 'continue';
    }
  }

  #adopt(state: GameState): void {
    this.#store.replace(syncClock(state, this.#clock.now()));
    this.#lastSavedAtState.set(state.time.lastSaved);
  }

  startAutosave(): void {
    if (this.#timer !== null) {
      return;
    }
    this.#timer = setInterval(() => this.save(), AUTOSAVE_INTERVAL_MS);
    this.#document.addEventListener('visibilitychange', this.#onVisibilityChange);
    this.#document.defaultView?.addEventListener('pagehide', this.#onPageHide);
  }

  stopAutosave(): void {
    if (this.#timer === null) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = null;
    this.#document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    this.#document.defaultView?.removeEventListener('pagehide', this.#onPageHide);
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
