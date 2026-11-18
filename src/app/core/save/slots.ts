import { GameState } from '../state/game-state';
import { decodeSave, encodeSave, SaveError } from './serialize';

export const SAVE_KEY = 'idleswarm.save';
export const BACKUP_KEY = 'idleswarm.save.backup';
export const UNREADABLE_KEY = 'idleswarm.save.unreadable';

/** Speicher-Schnittstelle; `localStorage` genügt ihr strukturell. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type SaveResult =
  | { readonly ok: true; readonly state: GameState }
  | { readonly ok: false; readonly error: SaveError };

export type LoadResult =
  | { readonly status: 'empty' }
  | { readonly status: 'loaded'; readonly state: GameState }
  | {
      readonly status: 'restored-from-backup';
      readonly state: GameState;
      readonly error: SaveError;
    }
  | { readonly status: 'failed'; readonly error: SaveError };

type SlotRead =
  | { readonly status: 'absent' }
  | { readonly status: 'readable'; readonly state: GameState }
  | { readonly status: 'unreadable'; readonly error: SaveError };

function toSaveError(error: unknown): SaveError {
  return error instanceof SaveError
    ? error
    : new SaveError('storage', 'Zugriff auf den Speicher fehlgeschlagen', { cause: error });
}

function readSlot(store: KeyValueStore, key: string): SlotRead {
  try {
    const text = store.getItem(key);
    return text === null ? { status: 'absent' } : { status: 'readable', state: decodeSave(text) };
  } catch (error) {
    return { status: 'unreadable', error: toSaveError(error) };
  }
}

function isReadable(text: string): boolean {
  try {
    decodeSave(text);
    return true;
  } catch {
    return false;
  }
}

function restoreSlot(store: KeyValueStore, key: string, value: string | null): void {
  try {
    if (value === null) {
      store.removeItem(key);
    } else {
      store.setItem(key, value);
    }
  } catch {
    // Der Primär-Stand ist unversehrt; der ursprüngliche Fehler wird gemeldet.
  }
}

/**
 * Sichert erst den bisherigen Primär-Stand und schreibt danach den neuen. Scheitert das Schreiben,
 * bleibt der Primär-Stand erhalten und der Sicherungs-Slot bekommt seinen alten Wert zurück.
 */
function replacePrimary(store: KeyValueStore, previous: string, text: string): void {
  const slot = isReadable(previous) ? BACKUP_KEY : UNREADABLE_KEY;
  const displaced = store.getItem(slot);
  store.setItem(slot, previous);
  try {
    store.setItem(SAVE_KEY, text);
  } catch (error) {
    restoreSlot(store, slot, displaced);
    throw error;
  }
}

/** Speichert `state` mit `time.lastSaved = now`; wirft nicht. */
export function saveGame(store: KeyValueStore, state: GameState, now: number): SaveResult {
  try {
    const next: GameState = { ...state, time: { ...state.time, lastSaved: now } };
    const text = encodeSave(next);
    const previous = store.getItem(SAVE_KEY);
    if (previous === null) {
      store.setItem(SAVE_KEY, text);
    } else {
      replacePrimary(store, previous, text);
    }
    return { ok: true, state: next };
  } catch (error) {
    return { ok: false, error: toSaveError(error) };
  }
}

/** Lädt den Primär-Stand, sonst das Backup; wirft nicht und verändert den Speicher nicht. */
export function loadGame(store: KeyValueStore): LoadResult {
  const primary = readSlot(store, SAVE_KEY);
  if (primary.status === 'readable') {
    return { status: 'loaded', state: primary.state };
  }
  const backup = readSlot(store, BACKUP_KEY);
  if (primary.status === 'absent' && backup.status === 'absent') {
    return { status: 'empty' };
  }
  const primaryError =
    primary.status === 'unreadable'
      ? primary.error
      : new SaveError('corrupt', 'Primär-Stand fehlt, obwohl ein Backup vorhanden ist');
  if (backup.status === 'readable') {
    return { status: 'restored-from-backup', state: backup.state, error: primaryError };
  }
  const error =
    primary.status === 'absent' && backup.status === 'unreadable' ? backup.error : primaryError;
  return { status: 'failed', error };
}
