import { TestBed } from '@angular/core/testing';

import { newGame } from '../../domain/new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import { serializeGame } from '../../domain/save-logic';
import { SaveStorage } from '../game-save/game-save-service.model';
import { NEW_GAME_SEED, SAVE_STORAGE, WALL_CLOCK_NOW } from '../game-save/game-save-service.tokens';
import { GAME_SAVE_KEY } from '../game-save/game-save.service';
import { provideGameStoreService } from './game-store-service.providers';
import { GAME_CONFIG } from './game-store-service.tokens';
import { GameStoreService } from './game-store.service';

function storageWith(saved: string | null): SaveStorage {
  return {
    getItem: (key) => (key === GAME_SAVE_KEY ? saved : null),
    setItem: () => undefined,
  };
}

function createStore(
  saved: string | null,
  storage: SaveStorage | null = storageWith(saved),
): GameStoreService {
  TestBed.configureTestingModule({
    providers: [
      provideGameStoreService(),
      { provide: GAME_CONFIG, useValue: PROTOTYPE_GAME_CONFIG },
      { provide: SAVE_STORAGE, useValue: storage },
      { provide: WALL_CLOCK_NOW, useValue: () => 2_000_000 },
      { provide: NEW_GAME_SEED, useValue: () => 4242 },
    ],
  });
  return TestBed.inject(GameStoreService);
}

describe('GameStoreService', () => {
  it('lädt einen gespeicherten Spielstand', () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 13, 1_000_000);
    saved.food = 123;

    const store = createStore(serializeGame(saved));

    expect(store.loadOutcome()).toBe('loaded');
    expect(store.state()).toEqual(saved);
  });

  it('beginnt bei einem kaputten Spielstand neu', () => {
    const store = createStore('{kaputt');

    expect(store.loadOutcome()).toBe('reset');
    expect(store.state()).toEqual(newGame(PROTOTYPE_GAME_CONFIG, 4242, 2_000_000));
  });

  it('beginnt bei gesperrtem Speicher ohne Fehler frisch', () => {
    const blocked: SaveStorage = {
      getItem: () => {
        throw new Error('gesperrt');
      },
      setItem: () => {
        throw new Error('gesperrt');
      },
    };

    const store = createStore(null, blocked);
    store.save();

    expect(store.loadOutcome()).toBe('fresh');
  });

  it('beginnt ohne Speicher frisch', () => {
    const store = createStore(null, null);
    store.save();

    expect(store.loadOutcome()).toBe('fresh');
  });

  it('speichert ein neues Spiel mit Seed und Zeit aus den Tokens und leert das Protokoll', () => {
    const written: string[] = [];
    const store = createStore(null, {
      getItem: () => null,
      setItem: (_key, value) => written.push(value),
    });
    addEmptySites(store, 1000, 3);
    store.advance(1);
    const lastId = store.events()[store.events().length - 1].id;

    store.newGame();

    const expected = newGame(PROTOTYPE_GAME_CONFIG, 4242, 2_000_000);
    expect(store.events()).toEqual([]);
    expect(store.state()).toEqual(expected);
    expect(written.map((raw) => JSON.parse(raw) as unknown)).toEqual([expected]);

    addEmptySites(store, 2000, 1);
    store.advance(1);
    expect(store.events()[0].id).toBe(lastId + 1);
  });

  it('zeigt nach dem Speichern den gespeicherten Zeitpunkt', () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 13, 1_000_000);
    const store = createStore(serializeGame(saved));

    store.save();

    expect(store.state().savedAt).toBe(2_000_000);
  });

  it('gibt Kopien aus, deren Änderung das Spiel nicht berührt', () => {
    const store = createStore(null);

    store.state().food = 1e9;
    store.markEndSeen();

    expect(store.state().food).not.toBe(1e9);
    expect(store.state().endSeen).toBe(true);
  });

  it('führt das Ereignisprotokoll mit steigenden IDs und höchstens 50 Einträgen', () => {
    const store = createStore(null);

    addEmptySites(store, 1000, 60);
    store.advance(1);
    const log = store.events();
    const lastId = log[log.length - 1].id;
    expect(log.length).toBe(50);
    expect(lastId).toBeGreaterThanOrEqual(60);
    expect(log.map((entry) => entry.id)).toEqual(log.map((_, i) => lastId - 49 + i));
    expect(log.every((entry) => entry.event.type === 'siteDried')).toBe(true);

    store.clearMark();
    expect(store.events()).toBe(log);

    addEmptySites(store, 2000, 1);
    store.advance(1);
    expect(store.events()[0].id).toBe(lastId + 1);
  });
});

function addEmptySites(store: GameStoreService, firstId: number, count: number): void {
  const game = store.state();
  const template = game.sites[0];
  for (let i = 0; i < count; i++)
    game.sites.push({ ...template, id: firstId + i, type: 'algae', stock: 0, dead: false });
  store.replace(game);
}
