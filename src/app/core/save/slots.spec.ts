import { compressToBase64 } from 'lz-string';

import { Num } from '../num/num';
import { createInitialState, GameState, STATE_VERSION } from '../state/game-state';
import { decodeSave, encodeSave, SaveError } from './serialize';
import { BACKUP_KEY, KeyValueStore, loadGame, SAVE_KEY, saveGame, UNREADABLE_KEY } from './slots';

const NOW = 1_700_000_000_000;
const CORRUPT = '%%% beschädigt %%%';
const FUTURE = compressToBase64(JSON.stringify({ version: STATE_VERSION + 1, neu: true }));

/** In-Memory-Speicher; `failSetAt` lässt die genannten `setItem`-Aufrufe (ab 1) scheitern. */
class MemoryStore implements KeyValueStore {
  readonly items = new Map<string, string>();
  failSetAt = new Set<number>();
  failGet = new Set<string>();
  failRemove = false;
  setCalls = 0;
  writes = 0;

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.items.set(key, value);
    }
  }

  getItem(key: string): string | null {
    if (this.failGet.has(key)) {
      throw new Error('blockiert');
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.setCalls++;
    if (this.failSetAt.has(this.setCalls)) {
      throw new Error('QuotaExceededError');
    }
    this.writes++;
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    if (this.failRemove) {
      throw new Error('blockiert');
    }
    this.writes++;
    this.items.delete(key);
  }

  snapshot(): Record<string, string> {
    return Object.fromEntries(this.items);
  }
}

function stateWithFood(food: number): GameState {
  return {
    ...createInitialState({ seed: 'idleswarm', now: NOW }),
    res: { food: Num.from(food), dna: Num.ZERO },
  };
}

const OLD = encodeSave(stateWithFood(1));
const CURRENT = encodeSave(stateWithFood(2));
const NEXT_STATE = stateWithFood(3);

function foodOf(text: string | undefined): number {
  return decodeSave(text as string).res.food.toNumber();
}

function expectError(result: ReturnType<typeof saveGame>, code: string): void {
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error).toBeInstanceOf(SaveError);
    expect(result.error.code).toBe(code);
  }
}

describe('KeyValueStore', () => {
  it('wird von Storage strukturell erfüllt', () => {
    const adapt = (storage: Storage): KeyValueStore => storage;
    expect(adapt).toBeTypeOf('function');
  });
});

describe('saveGame', () => {
  it('schreibt in einen leeren Speicher nur den Primär-Stand', () => {
    const store = new MemoryStore();
    const result = saveGame(store, NEXT_STATE, NOW + 1000);
    expect(result.ok).toBe(true);
    expect([...store.items.keys()]).toEqual([SAVE_KEY]);
    expect(foodOf(store.items.get(SAVE_KEY))).toBe(3);
  });

  it('setzt lastSaved und liefert den aktualisierten Zustand', () => {
    const store = new MemoryStore();
    const result = saveGame(store, NEXT_STATE, NOW + 1000);
    if (!result.ok) {
      throw result.error;
    }
    expect(result.state.time.lastSaved).toBe(NOW + 1000);
    expect(result.state.time.now).toBe(NEXT_STATE.time.now);
    expect(decodeSave(store.items.get(SAVE_KEY) as string).time.lastSaved).toBe(NOW + 1000);
  });

  it('verändert den übergebenen Zustand nicht', () => {
    const state = stateWithFood(3);
    Object.freeze(state);
    Object.freeze(state.time);
    const result = saveGame(new MemoryStore(), state, NOW + 1000);
    expect(result.ok).toBe(true);
    expect(state.time.lastSaved).toBe(NOW);
  });

  it('macht einen lesbaren Primär-Stand zum Backup', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    expect(saveGame(store, NEXT_STATE, NOW).ok).toBe(true);
    expect(store.items.get(BACKUP_KEY)).toBe(CURRENT);
    expect(foodOf(store.items.get(SAVE_KEY))).toBe(3);
    expect(store.items.has(UNREADABLE_KEY)).toBe(false);
  });

  it.each([
    ['beschädigt', CORRUPT],
    ['von einer neueren Version', FUTURE],
  ])('verschiebt einen unlesbaren Primär-Stand (%s) und schont das Backup', (_name, text) => {
    const store = new MemoryStore({ [SAVE_KEY]: text, [BACKUP_KEY]: OLD });
    expect(saveGame(store, NEXT_STATE, NOW).ok).toBe(true);
    expect(store.items.get(UNREADABLE_KEY)).toBe(text);
    expect(store.items.get(BACKUP_KEY)).toBe(OLD);
    expect(foodOf(store.items.get(SAVE_KEY))).toBe(3);
  });

  it('erhält alles, wenn schon das Sichern scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    store.failSetAt = new Set([1]);
    const before = store.snapshot();
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.snapshot()).toEqual(before);
  });

  it('erhält Primär-Stand und altes Backup, wenn das Schreiben scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    store.failSetAt = new Set([2]);
    const before = store.snapshot();
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.snapshot()).toEqual(before);
  });

  it('entfernt ein neu angelegtes Backup wieder, wenn das Schreiben scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT });
    store.failSetAt = new Set([2]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.snapshot()).toEqual({ [SAVE_KEY]: CURRENT });
  });

  it('erhält den Primär-Stand auch, wenn das Zurückrollen scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    store.failSetAt = new Set([2, 3]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.items.get(SAVE_KEY)).toBe(CURRENT);
    expect(store.items.get(BACKUP_KEY)).toBe(CURRENT);
  });

  it('erhält den Primär-Stand, wenn das Entfernen beim Zurückrollen scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT });
    store.failSetAt = new Set([2]);
    store.failRemove = true;
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.items.get(SAVE_KEY)).toBe(CURRENT);
  });

  it.each([1, 2])('erhält einen unlesbaren Primär-Stand beim %i. Schreibfehler', (failAt) => {
    const store = new MemoryStore({ [SAVE_KEY]: CORRUPT, [BACKUP_KEY]: OLD });
    store.failSetAt = new Set([failAt]);
    const before = store.snapshot();
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.snapshot()).toEqual(before);
  });

  it('legt ein unlesbares Backup beiseite, bevor es ersetzt wird', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: CORRUPT });
    expect(saveGame(store, NEXT_STATE, NOW).ok).toBe(true);
    expect(store.items.get(UNREADABLE_KEY)).toBe(CORRUPT);
    expect(store.items.get(BACKUP_KEY)).toBe(CURRENT);
    expect(foodOf(store.items.get(SAVE_KEY))).toBe(3);
  });

  it('erhält alles, wenn das Beiseitelegen des Backups scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: CORRUPT });
    store.failSetAt = new Set([1]);
    const before = store.snapshot();
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.snapshot()).toEqual(before);
  });

  it('schreibt nichts, wenn der Slot für Unlesbares nicht lesbar ist', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: CORRUPT });
    store.failGet = new Set([UNREADABLE_KEY]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.writes).toBe(0);
  });

  it('behält einen belegten Slot und ersetzt das unlesbare Backup', () => {
    const store = new MemoryStore({
      [SAVE_KEY]: CURRENT,
      [BACKUP_KEY]: CORRUPT,
      [UNREADABLE_KEY]: FUTURE,
    });
    expect(saveGame(store, NEXT_STATE, NOW).ok).toBe(true);
    expect(store.items.get(UNREADABLE_KEY)).toBe(FUTURE);
    expect(store.items.get(BACKUP_KEY)).toBe(CURRENT);
  });

  it('verliert das unlesbare Backup nicht, wenn das Schreiben des Primär-Stands scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: CORRUPT });
    store.failSetAt = new Set([3]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.items.get(SAVE_KEY)).toBe(CURRENT);
    expect(store.items.get(BACKUP_KEY)).toBe(CORRUPT);
    expect(store.items.get(UNREADABLE_KEY)).toBe(CORRUPT);
  });

  it('meldet einen Fehler beim ersten Schreiben in den leeren Speicher', () => {
    const store = new MemoryStore();
    store.failSetAt = new Set([1]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.items.size).toBe(0);
  });

  it('meldet ein werfendes getItem, ohne zu schreiben', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT });
    store.failGet = new Set([SAVE_KEY]);
    expectError(saveGame(store, NEXT_STATE, NOW), 'storage');
    expect(store.writes).toBe(0);
  });

  it.each([NaN, -1, Infinity])('schreibt mit dem ungültigen Zeitpunkt %s nichts', (now) => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    expectError(saveGame(store, NEXT_STATE, now), 'invalid');
    expect(store.writes).toBe(0);
  });

  it('schreibt einen ungültigen Zustand nicht', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    const state = { ...NEXT_STATE, res: { food: Num.from(-1), dna: Num.ZERO } };
    expectError(saveGame(store, state, NOW), 'invalid');
    expect(store.writes).toBe(0);
  });
});

describe('loadGame', () => {
  function expectUntouched(store: MemoryStore, action: () => void): void {
    const before = store.snapshot();
    action();
    expect(store.snapshot()).toEqual(before);
    expect(store.writes).toBe(0);
  }

  it('meldet einen leeren Speicher', () => {
    const store = new MemoryStore();
    expectUntouched(store, () => expect(loadGame(store)).toEqual({ status: 'empty' }));
  });

  it('zählt einen beiseitegelegten Stand nicht als Spielstand', () => {
    expect(loadGame(new MemoryStore({ [UNREADABLE_KEY]: CORRUPT }))).toEqual({ status: 'empty' });
  });

  it('lädt den Primär-Stand', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    expectUntouched(store, () => {
      const result = loadGame(store);
      expect(result.status).toBe('loaded');
      expect(result.status === 'loaded' && result.state.res.food.eq(2)).toBe(true);
    });
  });

  it.each([
    ['beschädigt', CORRUPT, 'corrupt'],
    ['von einer neueren Version', FUTURE, 'future-version'],
  ])('stellt aus dem Backup wieder her: Primär %s', (_name, text, code) => {
    const store = new MemoryStore({ [SAVE_KEY]: text, [BACKUP_KEY]: OLD });
    expectUntouched(store, () => {
      const result = loadGame(store);
      if (result.status !== 'restored-from-backup') {
        throw new Error(`Unerwarteter Status ${result.status}`);
      }
      expect(result.state.res.food.eq(1)).toBe(true);
      expect(result.error.code).toBe(code);
    });
  });

  it('stellt aus dem Backup wieder her, wenn der Primär-Stand fehlt', () => {
    const result = loadGame(new MemoryStore({ [BACKUP_KEY]: OLD }));
    expect(result.status).toBe('restored-from-backup');
  });

  it('stellt aus dem Backup wieder her, wenn nur das Lesen des Primär-Stands scheitert', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT, [BACKUP_KEY]: OLD });
    store.failGet = new Set([SAVE_KEY]);
    const result = loadGame(store);
    expect(result.status).toBe('restored-from-backup');
    expect(result.status === 'restored-from-backup' && result.error.code).toBe('storage');
  });

  it.each<[string, Record<string, string>, string]>([
    ['nur Primär beschädigt', { [SAVE_KEY]: CORRUPT }, 'corrupt'],
    ['beide unlesbar', { [SAVE_KEY]: FUTURE, [BACKUP_KEY]: CORRUPT }, 'future-version'],
    ['nur Backup beschädigt', { [BACKUP_KEY]: CORRUPT }, 'corrupt'],
  ])('scheitert: %s', (_name, items, code) => {
    const store = new MemoryStore(items);
    expectUntouched(store, () => {
      const result = loadGame(store);
      expect(result.status).toBe('failed');
      expect(result.status === 'failed' && result.error.code).toBe(code);
    });
  });

  it('scheitert ohne Ausnahme, wenn getItem wirft', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CURRENT });
    store.failGet = new Set([SAVE_KEY, BACKUP_KEY]);
    const result = loadGame(store);
    expect(result.status).toBe('failed');
    expect(result.status === 'failed' && result.error.code).toBe('storage');
  });

  it('meldet den Speicherfehler des Backups auch bei beschädigtem Primär-Stand', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CORRUPT, [BACKUP_KEY]: OLD });
    store.failGet = new Set([BACKUP_KEY]);
    const result = loadGame(store);
    expect(result.status).toBe('failed');
    expect(result.status === 'failed' && result.error.code).toBe('storage');
  });
});

describe('Speichern und Laden im Zusammenspiel', () => {
  it('erhält ein allein vorhandenes unlesbares Backup über mehrere Speicherungen', () => {
    const store = new MemoryStore({ [BACKUP_KEY]: CORRUPT });
    expect(loadGame(store).status).toBe('failed');
    saveGame(store, stateWithFood(2), NOW);
    saveGame(store, stateWithFood(3), NOW);
    expect(store.items.get(UNREADABLE_KEY)).toBe(CORRUPT);
    expect(foodOf(store.items.get(BACKUP_KEY))).toBe(2);
  });

  it('hält nach mehreren Speicherungen den vorletzten Stand als Backup', () => {
    const store = new MemoryStore();
    saveGame(store, stateWithFood(1), NOW);
    saveGame(store, stateWithFood(2), NOW);
    saveGame(store, stateWithFood(3), NOW);
    expect(foodOf(store.items.get(SAVE_KEY))).toBe(3);
    expect(foodOf(store.items.get(BACKUP_KEY))).toBe(2);
  });

  it('ersetzt ein gutes Backup auch über mehrere Speicherungen nie durch Unlesbares', () => {
    const store = new MemoryStore({ [SAVE_KEY]: CORRUPT, [BACKUP_KEY]: OLD });
    const restored = loadGame(store);
    expect(restored.status).toBe('restored-from-backup');
    saveGame(store, stateWithFood(3), NOW);
    expect(store.items.get(BACKUP_KEY)).toBe(OLD);
    expect(store.items.get(UNREADABLE_KEY)).toBe(CORRUPT);
    expect(loadGame(store).status).toBe('loaded');
  });
});
