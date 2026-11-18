import { TestBed } from '@angular/core/testing';

import { TICK_MS } from '@app/balance/domain/constants';
import { KEY_VALUE_STORE } from '@app/persistence/data-access/persistence/persistence-service.tokens';
import {
  AUTOSAVE_INTERVAL_MS,
  PersistenceService,
} from '@app/persistence/data-access/persistence/persistence.service';
import { KeyValueStore, loadGame, saveGame } from '@app/persistence/domain/slots-logic';

import { createInitialState } from '../../domain/game-state-logic';
import { GameLoop } from '../game-loop/game-loop.service';
import { GameStore } from '../game-store/game-store.service';
import { initGame, provideGameCore } from './game-core.providers';

const NOW = 1_700_000_000_000;

describe('initGame', () => {
  const items = new Map<string, string>();
  const memory: KeyValueStore = {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => void items.set(key, value),
    removeItem: (key) => void items.delete(key),
  };

  beforeEach(() => {
    items.clear();
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date', 'performance'], now: NOW });
    TestBed.configureTestingModule({
      providers: [
        GameStore,
        GameLoop,
        PersistenceService,
        { provide: KEY_VALUE_STORE, useValue: memory },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('lädt den Stand, lässt ihn ticken und speichert ihn automatisch', () => {
    saveGame(memory, createInitialState({ seed: 'alt', now: NOW - 1000 }), NOW - 1000);

    TestBed.runInInjectionContext(initGame);
    const store = TestBed.inject(GameStore);
    expect(store.state().seed).toBe('alt');

    vi.advanceTimersByTime(TICK_MS * 3);
    expect(store.state().time.played).toBe(TICK_MS * 3);

    vi.advanceTimersByTime(AUTOSAVE_INTERVAL_MS - TICK_MS * 3);
    const saved = loadGame(memory);
    expect(saved.status === 'loaded' && saved.state.time.lastSaved).toBe(
      NOW + AUTOSAVE_INTERVAL_MS,
    );
  });
});

describe('provideGameCore', () => {
  it('stellt Zustand, Takt und Autosave genau einmal bereit', () => {
    const providers = provideGameCore();
    expect(providers).toContain(GameStore);
    expect(providers).toContain(GameLoop);
    expect(providers).toContain(PersistenceService);
  });
});
