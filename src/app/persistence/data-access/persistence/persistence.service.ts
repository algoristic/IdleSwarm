import {
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  EffectRef,
  inject,
  Injectable,
  Injector,
  signal,
  untracked,
} from '@angular/core';

import { createNewGame, GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { syncClock } from '@app/engine/domain/step-logic';
import { DEFAULT_SETTINGS } from '@app/settings/domain/models/settings.model';
import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import { encodeSave, importSave as readImport, SaveError } from '../../domain/serialize-logic';
import { loadGame, LoadResult, saveGame } from '../../domain/slots-logic';
import type { ExportResult, ImportOutcome, RestoreNotice } from './persistence-service.model';
import { KEY_VALUE_STORE } from './persistence-service.tokens';

/** Standard-Abstand des Autosaves; wirksam ist `settings.autosaveIntervalMs` im Spielstand. */
export const AUTOSAVE_INTERVAL_MS = DEFAULT_SETTINGS.autosaveIntervalMs;

/** Lädt den Spielstand beim Start und speichert ihn automatisch. */
@Injectable()
export class PersistenceService {
  readonly #store = inject(GameStore);
  readonly #keyValueStore = inject(KEY_VALUE_STORE);
  readonly #document = inject(DOCUMENT);
  readonly #clock = inject(CLOCK);
  readonly #injector = inject(Injector);

  readonly #noticeState = signal<RestoreNotice | null>(null);
  readonly #lastSaveErrorState = signal<SaveError | null>(null);
  readonly #lastSavedAtState = signal<number | null>(null);

  /** Eingestelltes Intervall; ändert sich nur mit den Einstellungen, nicht mit jedem Tick. */
  readonly #autosaveIntervalMs = computed(() => this.#store.state().settings.autosaveIntervalMs);

  #timer: ReturnType<typeof setInterval> | null = null;
  #timerIntervalMs: number | null = null;
  #intervalWatch: EffectRef | null = null;
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
      this.#store.load(createNewGame(this.#clock.now()));
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
   * Speichert und liefert den aktuellen Stand als Export-Text (US-07.04); derselbe Text wie im
   * Speicher. Scheitert nur bei einem Zustand, den das Laden ablehnen würde.
   */
  exportSave(): ExportResult {
    this.save();
    try {
      return { ok: true, text: encodeSave(this.#store.state()) };
    } catch (error) {
      if (error instanceof SaveError) {
        return { ok: false, error: error.code };
      }
      throw error;
    }
  }

  /**
   * Übernimmt einen Export-Text (US-07.04): prüfen und migrieren, dann wie ein neues Spiel einsetzen
   * und sofort speichern. Die Zeit seit dem Export wird nicht nachgeholt, sonst ließe sich mit alten
   * Texten Fortschritt gewinnen; die Uhr wird nur abgeglichen. Ein fehlerhafter Text ändert nichts.
   */
  importSave(text: string): ImportOutcome {
    const result = readImport(text);
    if (!result.ok) {
      return result.error.code;
    }
    this.#replaceGame(result.state);
    return 'imported';
  }

  /**
   * Beginnt ein neues Spiel mit neuem Seed (US-07.05) und speichert sofort. Die Einstellungen bleiben,
   * das Onboarding beginnt von vorn.
   */
  resetGame(): void {
    const { settings } = this.#store.state();
    this.#replaceGame({ ...createNewGame(this.#clock.now()), settings });
  }

  /**
   * Setzt bewusst ein anderes Spiel ein. Ein beim Start gescheitertes Laden wird nicht mehr
   * nachgeholt (der Spieler ersetzt den Stand ausdrücklich). Das Speichern verdrängt wie jedes
   * Speichern den bisherigen Primär-Stand ins Backup.
   */
  #replaceGame(state: GameState): void {
    this.#loadIncomplete = false;
    this.#lastWritten = null;
    this.#noticeState.set(null);
    this.#store.load(state);
    this.#store.replace(syncClock(this.#store.state(), this.#clock.now()));
    this.save();
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

  /**
   * Setzt den geladenen Stand ein und holt die Zeit seit dem letzten Speichern nach (US-07.01,
   * höchstens `T_max`); die Ereignisse landen im frisch geleerten Log, die Zusammenfassung in
   * `GameStore.lastCatchUp`. Danach wird die Uhr abgeglichen, auch wenn sie zurückgestellt war.
   */
  #adopt(state: GameState): void {
    const now = this.#clock.now();
    this.#store.load(state);
    this.#store.catchUp(now - state.time.lastSaved, 'load');
    this.#store.replace(syncClock(this.#store.state(), now));
    this.#lastSavedAtState.set(state.time.lastSaved);
  }

  /**
   * Speichert im eingestellten Intervall, beim Verbergen und bei `pagehide`. Ändert sich das
   * Intervall (Einstellung, Import, Laden), startet der Timer mit dem neuen Wert neu.
   */
  startAutosave(): void {
    if (this.#timer !== null) {
      return;
    }
    this.#startTimer(untracked(this.#autosaveIntervalMs));
    // Seiteneffekt nach außen (Timer); der erste Lauf startet nichts neu.
    this.#intervalWatch = effect(
      () => {
        const intervalMs = this.#autosaveIntervalMs();
        if (this.#timer !== null && intervalMs !== this.#timerIntervalMs) {
          this.#startTimer(intervalMs);
        }
      },
      { injector: this.#injector },
    );
    this.#document.addEventListener('visibilitychange', this.#onVisibilityChange);
    this.#document.defaultView?.addEventListener('pagehide', this.#onPageHide);
  }

  stopAutosave(): void {
    if (this.#timer === null) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = null;
    this.#timerIntervalMs = null;
    this.#intervalWatch?.destroy();
    this.#intervalWatch = null;
    this.#document.removeEventListener('visibilitychange', this.#onVisibilityChange);
    this.#document.defaultView?.removeEventListener('pagehide', this.#onPageHide);
  }

  #startTimer(intervalMs: number): void {
    if (this.#timer !== null) {
      clearInterval(this.#timer);
    }
    this.#timer = setInterval(() => this.save(), intervalMs);
    this.#timerIntervalMs = intervalMs;
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
