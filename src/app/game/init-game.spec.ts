import { TestBed } from '@angular/core/testing';

import { TICK_MS } from '../core/balance/constants';
import { KeyValueStore, loadGame, saveGame } from '../core/save/slots';
import { createInitialState } from '../core/state/game-state';
import { GameStoreService } from './game-store.service';
import { initGame } from './init-game';
import { AUTOSAVE_INTERVAL_MS, KEY_VALUE_STORE } from './persistence.service';

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
      providers: [{ provide: KEY_VALUE_STORE, useValue: memory }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });

  it('lädt den Stand, lässt ihn ticken und speichert ihn automatisch', () => {
    saveGame(memory, createInitialState({ seed: 'alt', now: NOW - 1000 }), NOW - 1000);

    TestBed.runInInjectionContext(initGame);
    const store = TestBed.inject(GameStoreService);
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
