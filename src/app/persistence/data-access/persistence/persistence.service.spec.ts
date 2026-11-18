import { TestBed } from '@angular/core/testing';

import { TICK_MS } from '@app/balance/domain/constants';
import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import {
  BACKUP_KEY,
  KeyValueStore,
  loadGame,
  SAVE_KEY,
  saveGame,
  UNREADABLE_KEY,
} from '../../domain/slots-logic';
import { KEY_VALUE_STORE } from './persistence-service.tokens';
import { AUTOSAVE_INTERVAL_MS, PersistenceService } from './persistence.service';

const NOW = 1_700_000_000_000;
const SAVED_AT = NOW - 3_600_000;

class MemoryStore implements KeyValueStore {
  readonly items = new Map<string, string>();
  readonly failReads = new Set<string>();
  failWrites = false;

  getItem(key: string): string | null {
    if (this.failReads.has(key)) {
      throw new DOMException('gesperrt', 'SecurityError');
    }
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.failWrites) {
      throw new DOMException('voll', 'QuotaExceededError');
    }
    this.items.set(key, value);
  }

  removeItem(key: string): void {
    this.items.delete(key);
  }
}

describe('PersistenceService', () => {
  let memory: MemoryStore;
  let persistence: PersistenceService;
  let store: GameStore;

  function createServices(): void {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [GameStore, PersistenceService, { provide: KEY_VALUE_STORE, useValue: memory }],
    });
    persistence = TestBed.inject(PersistenceService);
    store = TestBed.inject(GameStore);
  }

  function savedState(): GameState {
    const base = createInitialState({ seed: 'gespeichert', now: SAVED_AT });
    return {
      ...base,
      time: { ...base.time, played: 5000 },
      res: { ...base.res, food: Num.from('1.5e30') },
    };
  }

  function writeSave(): void {
    const result = saveGame(memory, savedState(), SAVED_AT);
    expect(result.ok).toBe(true);
  }

  function setHidden(hidden: boolean): void {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  const savedText = () => memory.getItem(SAVE_KEY);

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: NOW });
    memory = new MemoryStore();
    createServices();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    delete (document as { hidden?: boolean }).hidden;
    vi.useRealTimers();
  });

  describe('restore', () => {
    it('übernimmt bei loaded den Stand und gleicht die Uhr ab', () => {
      writeSave();

      expect(persistence.restore()).toBe('loaded');

      const { time, seed, res } = store.state();
      expect(seed).toBe('gespeichert');
      expect(res.food.eq('1.5e30')).toBe(true);
      expect(time).toEqual({ now: NOW, lastSaved: SAVED_AT, played: 5000 });
      expect(persistence.notice()).toBeNull();
      expect(persistence.lastSavedAt()).toBe(SAVED_AT);
    });

    it('übernimmt bei restored-from-backup das Backup und meldet es', () => {
      writeSave();
      saveGame(memory, savedState(), SAVED_AT + 1);
      memory.items.set(SAVE_KEY, 'kaputt');

      expect(persistence.restore()).toBe('restored-from-backup');

      expect(store.state().seed).toBe('gespeichert');
      expect(store.state().time.now).toBe(NOW);
      expect(persistence.notice()).toBe('restored-from-backup');
      expect(persistence.lastSavedAt()).toBe(SAVED_AT);
    });

    it('beginnt bei failed neu, meldet es und legt den Stand beim Speichern beiseite', () => {
      memory.items.set(SAVE_KEY, 'kaputt');

      expect(persistence.restore()).toBe('failed');

      expect(store.state().time).toEqual({ now: NOW, lastSaved: NOW, played: 0 });
      expect(persistence.notice()).toBe('save-unreadable');
      expect(persistence.lastSavedAt()).toBeNull();
      expect(savedText()).toBe('kaputt');

      expect(persistence.save()).toBe(true);
      expect(memory.getItem(UNREADABLE_KEY)).toBe('kaputt');
      expect(loadGame(memory).status).toBe('loaded');
    });

    it('beginnt bei empty ohne Hinweis neu', () => {
      expect(persistence.restore()).toBe('empty');

      expect(store.state().time.played).toBe(0);
      expect(persistence.notice()).toBeNull();
      expect(persistence.lastSavedAt()).toBeNull();
      expect(memory.items.size).toBe(0);
    });

    it('setzt Hinweis und Speicherfehler eines früheren Laufs zurück', () => {
      memory.items.set(SAVE_KEY, 'kaputt');
      persistence.restore();
      memory.failWrites = true;
      persistence.save();
      memory.failWrites = false;
      memory.items.clear();

      persistence.restore();

      expect(persistence.notice()).toBeNull();
      expect(persistence.lastSaveError()).toBeNull();
    });
  });

  describe('save', () => {
    it('übernimmt lastSaved in den Store', () => {
      store.tick(TICK_MS);
      vi.setSystemTime(NOW + 500);

      expect(persistence.save()).toBe(true);

      expect(store.state().time.lastSaved).toBe(NOW + 500);
      expect(persistence.lastSavedAt()).toBe(NOW + 500);
    });

    it('ergibt über einen neuen Dienst denselben Zustand', () => {
      store.replace(savedState());
      store.tick(TICK_MS);
      persistence.save();
      const saved = store.state();

      createServices();
      vi.setSystemTime(NOW + 1000);
      expect(persistence.restore()).toBe('loaded');

      expect(store.state()).toEqual({
        ...saved,
        time: { ...saved.time, now: NOW + 1000 },
      });
    });

    it('schreibt einen unveränderten Zustand nicht erneut', () => {
      persistence.save();
      persistence.save();
      expect(memory.getItem(BACKUP_KEY)).toBeNull();

      store.tick(TICK_MS);
      persistence.save();
      expect(memory.getItem(BACKUP_KEY)).not.toBeNull();
    });

    it('meldet Fehler, bricht nichts ab und versucht es erneut', () => {
      persistence.startAutosave();
      memory.failWrites = true;
      const before = store.state();

      expect(() => vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS)).not.toThrow();

      expect(persistence.lastSaveError()?.code).toBe('storage');
      expect(persistence.lastSavedAt()).toBeNull();
      expect(store.state()).toBe(before);

      memory.failWrites = false;
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);

      expect(persistence.lastSaveError()).toBeNull();
      expect(persistence.lastSavedAt()).toBe(NOW + 2 * AUTOSAVE_INTERVAL_MS);
      expect(savedText()).not.toBeNull();
    });
  });

  describe('unvollständiges Laden', () => {
    const blockReads = (...keys: string[]) => keys.forEach((key) => memory.failReads.add(key));
    const unblockReads = () => memory.failReads.clear();
    const snapshot = () => Object.fromEntries(memory.items);

    function writeState(played: number): void {
      const base = savedState();
      saveGame(memory, { ...base, time: { ...base.time, played } }, SAVED_AT);
    }

    it('lädt den echten Stand nach und überschreibt ihn nicht', () => {
      writeSave();
      const original = savedText();
      blockReads(SAVE_KEY, BACKUP_KEY);
      expect(persistence.restore()).toBe('failed');
      expect(persistence.notice()).toBe('save-unreadable');
      store.tick(TICK_MS);
      unblockReads();

      expect(persistence.save()).toBe(true);

      expect(savedText()).toBe(original);
      expect(store.state().seed).toBe('gespeichert');
      expect(store.state().time).toEqual({ now: NOW, lastSaved: SAVED_AT, played: 5000 });
      expect(persistence.lastSavedAt()).toBe(SAVED_AT);
      expect(persistence.notice()).toBeNull();

      expect(persistence.save()).toBe(true);

      expect(memory.getItem(BACKUP_KEY)).toBe(original);
      const loaded = loadGame(memory);
      expect(loaded.status === 'loaded' && loaded.state.seed).toBe('gespeichert');
      expect(loaded.status === 'loaded' && loaded.state.time.played).toBe(5000);
    });

    it('schreibt nichts, solange der Speicher defekt bleibt', () => {
      writeSave();
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      const before = snapshot();
      const setItem = vi.spyOn(memory, 'setItem');

      expect(persistence.save()).toBe(false);
      expect(persistence.save()).toBe(false);

      expect(setItem).not.toHaveBeenCalled();
      expect(snapshot()).toEqual(before);
      expect(persistence.lastSaveError()?.code).toBe('storage');
      expect(persistence.lastSavedAt()).toBeNull();
    });

    it('löscht den Speicherfehler, sobald der Stand nachgeladen ist', () => {
      writeSave();
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      persistence.save();
      unblockReads();

      expect(persistence.save()).toBe(true);
      expect(persistence.lastSaveError()).toBeNull();
    });

    it('wartet auch nach einer Wiederherstellung aus dem Backup auf den Primär-Stand', () => {
      writeState(5000);
      writeState(7000);
      blockReads(SAVE_KEY);
      expect(persistence.restore()).toBe('restored-from-backup');
      expect(store.state().time.played).toBe(5000);
      const before = snapshot();

      expect(persistence.save()).toBe(false);
      expect(snapshot()).toEqual(before);
      expect(persistence.notice()).toBe('restored-from-backup');

      unblockReads();
      expect(persistence.save()).toBe(true);

      expect(snapshot()).toEqual(before);
      expect(store.state().time.played).toBe(7000);
      expect(persistence.notice()).toBeNull();
    });

    it('blockiert auch, wenn nur das Backup neben beschädigtem Primär-Stand fehlschlägt', () => {
      writeState(5000);
      writeState(7000);
      memory.items.set(SAVE_KEY, 'kaputt');
      blockReads(BACKUP_KEY);
      expect(persistence.restore()).toBe('failed');
      const before = snapshot();

      expect(persistence.save()).toBe(false);

      expect(snapshot()).toEqual(before);
    });

    it('übernimmt beim Nachladen das Backup und meldet es', () => {
      writeState(5000);
      writeState(7000);
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      memory.items.set(SAVE_KEY, 'kaputt');
      unblockReads();
      const before = snapshot();

      expect(persistence.save()).toBe(true);

      expect(snapshot()).toEqual(before);
      expect(store.state().time.played).toBe(5000);
      expect(persistence.notice()).toBe('restored-from-backup');
      expect(persistence.lastSavedAt()).toBe(SAVED_AT);
    });

    it('speichert normal, wenn der Speicher sich als leer erweist', () => {
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      store.tick(TICK_MS);
      unblockReads();

      expect(persistence.save()).toBe(true);

      expect(store.state().time.played).toBe(TICK_MS);
      expect(savedText()).not.toBeNull();
      expect(persistence.notice()).toBeNull();
      expect(persistence.lastSavedAt()).toBe(NOW);
    });

    it('legt einen nun lesbar gemeldeten, aber beschädigten Stand beiseite', () => {
      memory.items.set(SAVE_KEY, 'kaputt');
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      unblockReads();

      expect(persistence.save()).toBe(true);

      expect(memory.getItem(UNREADABLE_KEY)).toBe('kaputt');
      expect(loadGame(memory).status).toBe('loaded');
      expect(persistence.notice()).toBe('save-unreadable');
    });

    it('prüft nach dem Klären nicht erneut', () => {
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      unblockReads();
      persistence.save();
      writeState(7000);
      store.tick(TICK_MS);

      expect(persistence.save()).toBe(true);

      expect(store.state().seed).not.toBe('gespeichert');
    });

    it('setzt den Merker bei jedem restore neu', () => {
      writeSave();
      const original = savedText();
      blockReads(SAVE_KEY, BACKUP_KEY);
      persistence.restore();
      unblockReads();
      expect(persistence.restore()).toBe('loaded');
      store.tick(TICK_MS);

      expect(persistence.save()).toBe(true);

      expect(savedText()).not.toBe(original);
      expect(memory.getItem(BACKUP_KEY)).toBe(original);
    });
  });

  describe('Autosave', () => {
    beforeEach(() => persistence.startAutosave());

    it('speichert erst nach 30 s', () => {
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS - 1);
      expect(savedText()).toBeNull();
      vi.advanceTimersByTime(1);
      expect(savedText()).not.toBeNull();
    });

    it('speichert synchron, wenn die Seite verborgen wird', () => {
      setHidden(true);
      expect(savedText()).not.toBeNull();
    });

    it('speichert nicht, wenn die Seite wieder sichtbar wird', () => {
      setHidden(false);
      expect(savedText()).toBeNull();
    });

    it('speichert synchron bei pagehide', () => {
      window.dispatchEvent(new Event('pagehide'));
      expect(savedText()).not.toBeNull();
    });

    it('legt bei doppeltem Start nur einen Timer an', () => {
      persistence.startAutosave();
      expect(vi.getTimerCount()).toBe(1);
    });

    it('speichert nach dem Stoppen nicht mehr', () => {
      persistence.stopAutosave();
      persistence.stopAutosave();
      vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS);
      setHidden(true);
      window.dispatchEvent(new Event('pagehide'));
      expect(savedText()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('räumt beim Zerstören auf', () => {
      TestBed.resetTestingModule();
      window.dispatchEvent(new Event('pagehide'));
      expect(savedText()).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('Standard-Speicher', () => {
    afterEach(() => {
      delete (window as { localStorage?: Storage }).localStorage;
    });

    function useDefaultStore(): void {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [GameStore, PersistenceService] });
      persistence = TestBed.inject(PersistenceService);
    }

    it('greift bei jedem Aufruf auf window.localStorage zu', () => {
      const first = new MemoryStore();
      const second = new MemoryStore();
      let current = first;
      Object.defineProperty(window, 'localStorage', { configurable: true, get: () => current });
      useDefaultStore();

      persistence.save();
      expect(first.getItem(SAVE_KEY)).not.toBeNull();

      current = second;
      TestBed.inject(GameStore).tick(TICK_MS);
      persistence.save();
      expect(second.getItem(SAVE_KEY)).not.toBeNull();

      TestBed.inject(KEY_VALUE_STORE).removeItem(SAVE_KEY);
      expect(second.getItem(SAVE_KEY)).toBeNull();
    });

    it('übersteht einen werfenden Zugriff', () => {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => {
          throw new DOMException('gesperrt', 'SecurityError');
        },
      });
      useDefaultStore();

      expect(persistence.restore()).toBe('failed');
      expect(persistence.save()).toBe(false);
      expect(persistence.lastSaveError()?.code).toBe('storage');
    });
  });
});
