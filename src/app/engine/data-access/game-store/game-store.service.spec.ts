import { TestBed } from '@angular/core/testing';

import { TICK_MS } from '@app/balance/domain/constants';

import { Command } from '../../domain/commands-logic';
import { createInitialState } from '../../domain/game-state-logic';
import { createNewGame, createSeed, GameStore } from './game-store.service';

describe('createSeed', () => {
  it('liefert 16 Hex-Zeichen und wechselt zwischen Aufrufen', () => {
    expect(createSeed()).toMatch(/^[0-9a-f]{16}$/);
    expect(createSeed()).not.toBe(createSeed());
  });
});

describe('createNewGame', () => {
  it('nutzt die übergebene Zeit', () => {
    expect(createNewGame(1234).time).toEqual({ now: 1234, lastSaved: 1234, played: 0 });
  });
});

describe('GameStore', () => {
  let store: GameStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameStore] });
    store = TestBed.inject(GameStore);
  });

  it('startet mit einem neuen Spiel', () => {
    expect(store.state().seed).toMatch(/^[0-9a-f]{16}$/);
    expect(store.state().time.played).toBe(0);
  });

  it('wendet Kommandos sofort an', () => {
    const before = store.state();
    store.dispatch({ type: 'noop' });
    expect(store.state()).toBe(before);

    // Nur ein synchroner Aufruf von apply kann hier schon werfen.
    expect(() => store.dispatch({ type: 'unbekannt' } as unknown as Command)).toThrow(TypeError);
  });

  it('schreibt mit tick die Zeit fort und gibt die Ereignisse zurück', () => {
    const before = store.state().time;
    expect(store.tick(TICK_MS)).toEqual([]);
    expect(store.state().time.played).toBe(before.played + TICK_MS);
    expect(store.state().time.now).toBe(before.now + TICK_MS);
  });

  it('ersetzt den Zustand', () => {
    const next = createInitialState({ seed: 'neu', now: 1 });
    store.replace(next);
    expect(store.state()).toBe(next);
  });
});
