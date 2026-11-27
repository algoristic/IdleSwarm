import { TestBed } from '@angular/core/testing';

import { catchUp } from '../../domain/catch-up-logic';
import { newGame } from '../../domain/new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import { serializeGame } from '../../domain/save-logic';
import { CatchUpRequest, CatchUpWorker } from '../catch-up/catch-up-service.model';
import { CATCH_UP_WORKER_FACTORY } from '../catch-up/catch-up-service.tokens';
import { SaveStorage } from '../game-save/game-save-service.model';
import { NEW_GAME_SEED, SAVE_STORAGE, WALL_CLOCK_NOW } from '../game-save/game-save-service.tokens';
import { GAME_SAVE_KEY } from '../game-save/game-save.service';
import { GAME_CONFIG } from '../game-store/game-store-service.tokens';
import { GameStoreService } from '../game-store/game-store.service';
import { FrameScheduler, PageVisibility } from './game-loop-service.model';
import { provideGameLoopService } from './game-loop-service.providers';
import { FRAME_SCHEDULER, MONOTONIC_NOW, PAGE_VISIBILITY } from './game-loop-service.tokens';
import { GameLoopService } from './game-loop.service';

class FakeFrames implements FrameScheduler {
  queue = new Map<number, (now: number) => void>();
  #nextHandle = 1;

  request(callback: (now: number) => void): number {
    const handle = this.#nextHandle++;
    this.queue.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.queue.delete(handle);
  }

  run(now: number): void {
    const callbacks = [...this.queue.values()];
    this.queue.clear();
    for (const callback of callbacks) callback(now);
  }
}

class FakeVisibility implements PageVisibility {
  hidden = false;
  visibilityListeners = new Set<() => void>();
  pageHideListeners = new Set<() => void>();

  isHidden(): boolean {
    return this.hidden;
  }

  onVisibilityChange(listener: () => void): () => void {
    this.visibilityListeners.add(listener);
    return () => this.visibilityListeners.delete(listener);
  }

  onPageHide(listener: () => void): () => void {
    this.pageHideListeners.add(listener);
    return () => this.pageHideListeners.delete(listener);
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    for (const listener of this.visibilityListeners) listener();
  }

  hidePage(): void {
    for (const listener of this.pageHideListeners) listener();
  }
}

class FakeCatchUpWorker implements CatchUpWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  request: CatchUpRequest | null = null;
  terminated = false;

  postMessage(message: CatchUpRequest): void {
    this.request = structuredClone(message);
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(): void {
    if (!this.request) return;
    const { config, state, seconds } = this.request;
    const summary = catchUp(config, state, seconds);
    this.onmessage?.(new MessageEvent('message', { data: { type: 'done', state, summary } }));
  }
}

function settle(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

class MemoryStorage implements SaveStorage {
  items = new Map<string, string>();
  writes = 0;

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.writes++;
    this.items.set(key, value);
  }
}

describe('GameLoopService', () => {
  let frames: FakeFrames;
  let visibility: FakeVisibility;
  let storage: MemoryStorage;
  let wallNow: number;
  let loop: GameLoopService;
  let store: GameStoreService;
  let workers: FakeCatchUpWorker[];
  let useWorker: boolean;

  beforeEach(() => {
    workers = [];
    useWorker = false;
    frames = new FakeFrames();
    visibility = new FakeVisibility();
    storage = new MemoryStorage();
    wallNow = 1_000_000;
    configure();
    loop = TestBed.inject(GameLoopService);
    store = TestBed.inject(GameStoreService);
  });

  function configure(): void {
    TestBed.configureTestingModule({
      providers: [
        provideGameLoopService(),
        { provide: GAME_CONFIG, useValue: PROTOTYPE_GAME_CONFIG },
        { provide: FRAME_SCHEDULER, useValue: frames },
        { provide: MONOTONIC_NOW, useValue: () => 1000 },
        { provide: WALL_CLOCK_NOW, useValue: () => wallNow },
        { provide: NEW_GAME_SEED, useValue: () => 4242 },
        { provide: PAGE_VISIBILITY, useValue: visibility },
        { provide: SAVE_STORAGE, useValue: storage },
        { provide: CATCH_UP_WORKER_FACTORY, useValue: createWorker },
      ],
    });
  }

  function createWorker(): CatchUpWorker | null {
    if (!useWorker) return null;
    const worker = new FakeCatchUpWorker();
    workers.push(worker);
    return worker;
  }

  function restartWith(saved: string): void {
    TestBed.resetTestingModule();
    storage = new MemoryStorage();
    storage.items.set(GAME_SAVE_KEY, saved);
    configure();
    loop = TestBed.inject(GameLoopService);
    store = TestBed.inject(GameStoreService);
  }

  function savedAt(): number {
    const raw = storage.getItem(GAME_SAVE_KEY);
    return raw ? (JSON.parse(raw) as { savedAt: number }).savedAt : Number.NaN;
  }

  it('speichert direkt nach einem frischen Start', () => {
    loop.start();

    expect(store.loadOutcome()).toBe('fresh');
    expect(storage.writes).toBe(1);
    expect(savedAt()).toBe(1_000_000);
  });

  it('speichert nach dem Laden eines Spielstands nicht sofort', () => {
    restartWith(serializeGame(newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000)));

    loop.start();

    expect(store.loadOutcome()).toBe('loaded');
    expect(storage.writes).toBe(0);
  });

  it('speichert direkt nach einem Start mit kaputtem Spielstand', () => {
    restartWith('{kaputt');

    loop.start();

    expect(store.loadOutcome()).toBe('reset');
    expect(storage.writes).toBe(1);
  });

  it('läuft nach stop() und start() mit genau einer Frame-Kette weiter', () => {
    loop.start();
    const startTime = store.state().time;
    loop.stop();
    loop.start();
    expect(frames.queue.size).toBe(1);

    frames.run(1250);
    expect(frames.queue.size).toBe(1);
    expect(store.state().time).toBe(startTime + 0.25);
  });

  it('bricht beim Zerstören die Frames ab und speichert', () => {
    loop.start();

    TestBed.resetTestingModule();

    expect(frames.queue.size).toBe(0);
    expect(storage.writes).toBe(2);
  });

  it('führt je verstrichener Zeit und Tempo feste Schritte von 0,25 s aus', () => {
    loop.start();
    const startTime = store.state().time;

    frames.run(1100);
    expect(store.state().time).toBe(startTime);

    frames.run(1300);
    expect(store.state().time).toBe(startTime + 0.25);

    loop.setTempo(10);
    frames.run(1400);
    expect(store.state().time).toBe(startTime + 1.25);

    loop.setTempo(1);
    frames.run(6400);
    expect(store.state().time).toBe(startTime + 2.25);
  });

  it('gibt ohne Schritt keinen neuen Schnappschuss aus', () => {
    loop.start();
    const before = store.state();

    frames.run(1100);
    expect(store.state()).toBe(before);

    frames.run(1300);
    expect(store.state()).not.toBe(before);
  });

  it('speichert alle 10 s Echtzeit unabhängig vom Tempo', () => {
    loop.start();
    loop.setTempo(5);
    for (let i = 1; i <= 9; i++) frames.run(1000 + i * 1000);
    expect(storage.writes).toBe(1);

    wallNow = 1_010_000;
    frames.run(11_000);
    expect(storage.writes).toBe(2);
    expect(savedAt()).toBe(1_010_000);
  });

  it('speichert bei pagehide und beim Verstecken', () => {
    loop.start();

    visibility.hidePage();
    expect(storage.writes).toBe(2);

    visibility.setHidden(true);
    expect(storage.writes).toBe(3);

    visibility.setHidden(false);
    expect(storage.writes).toBe(3);
  });

  it('beendet mit stop() die Frames und die Listener und speichert', () => {
    loop.start();
    loop.start();
    expect(frames.queue.size).toBe(1);

    loop.stop();
    expect(frames.queue.size).toBe(0);
    expect(storage.writes).toBe(2);

    visibility.hidePage();
    loop.stop();
    expect(storage.writes).toBe(2);
  });

  it('rechnet in der Pause nicht weiter', () => {
    loop.start();
    const startTime = store.state().time;

    loop.pause();
    frames.run(2000);
    loop.resume();
    frames.run(1250);

    expect(store.state().time).toBe(startTime + 0.25);
  });
  it('rechnet beim Start die Zeit seit dem Speichern nach und zeigt die Zusammenfassung', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000);
    restartWith(serializeGame(saved));

    loop.start();
    expect(store.catchingUp()).toBe(true);
    await settle();

    expect(store.catchingUp()).toBe(false);
    expect(store.state().time).toBe(saved.time + 100);
    expect(loop.catchUpSummary()).toMatchObject({ seconds: 100, steps: 400, capped: false });
    expect(storage.writes).toBe(0);

    loop.dismissCatchUpSummary();
    expect(loop.catchUpSummary()).toBeNull();
  });

  it('zeigt nach einer kurzen Nachberechnung keine Zusammenfassung', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 990_000);
    restartWith(serializeGame(saved));

    loop.start();
    await settle();

    expect(store.state().time).toBe(saved.time + 10);
    expect(loop.catchUpSummary()).toBeNull();
  });

  it('sperrt während der Nachberechnung Aktionen, Speichern und Frames', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000);
    useWorker = true;
    restartWith(serializeGame(saved));

    loop.start();
    expect(workers.length).toBe(1);
    expect(store.buyUnit(0, 'one')).toBeNull();
    store.save();
    frames.run(1500);
    expect(storage.writes).toBe(0);
    expect(store.state().time).toBe(saved.time);

    workers[0].respond();
    await settle();
    expect(workers[0].terminated).toBe(true);
    expect(store.state().time).toBe(saved.time + 100);

    frames.run(1250);
    expect(store.state().time).toBe(saved.time + 100.25);
    expect(store.clearMark()).not.toBeNull();
  });

  it('rechnet beim Sichtbarwerden erst nach mehr als 2 s nach', async () => {
    useWorker = true;
    loop.start();
    const startTime = store.state().time;

    visibility.setHidden(true);
    wallNow += 1000;
    visibility.setHidden(false);
    expect(workers.length).toBe(0);

    visibility.setHidden(true);
    wallNow += 3000;
    visibility.setHidden(false);
    expect(workers.length).toBe(1);
    expect(workers[0].request?.seconds).toBe(3);

    workers[0].respond();
    await settle();
    expect(store.state().time).toBe(startTime + 3);
  });

  it('arbeitet Lücken während einer Nachberechnung danach ab', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000);
    useWorker = true;
    restartWith(serializeGame(saved));
    loop.start();

    visibility.setHidden(true);
    wallNow += 3000;
    visibility.setHidden(false);
    expect(workers.length).toBe(1);

    workers[0].respond();
    await settle();
    expect(workers.length).toBe(2);
    expect(workers[1].request?.seconds).toBe(3);
    expect(store.catchingUp()).toBe(true);

    workers[1].respond();
    await settle();
    expect(store.catchingUp()).toBe(false);
    expect(store.state().time).toBe(saved.time + 103);
    expect(loop.catchUpSummary()?.seconds).toBe(103);
    expect(storage.writes).toBe(0);
  });

  it('verwirft nach stop() die laufende Nachberechnung und rechnet beim nächsten Start neu', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000);
    useWorker = true;
    restartWith(serializeGame(saved));
    loop.start();

    loop.stop();
    expect(workers[0].terminated).toBe(true);
    expect(storage.writes).toBe(0);
    await settle();
    expect(store.catchingUp()).toBe(false);
    expect(store.state().time).toBe(saved.time);

    loop.start();
    expect(workers.length).toBe(2);
    expect(workers[1].request?.seconds).toBe(100);
  });
  it('rechnet nach stop() und start() zwischen zwei Läufen nur die offene Zeit nach', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 900_000);
    useWorker = true;
    restartWith(serializeGame(saved));
    loop.start();

    visibility.setHidden(true);
    wallNow += 3000;
    visibility.setHidden(false);
    workers[0].respond();
    await settle();
    expect(store.state().time).toBe(saved.time + 100);
    expect(workers.length).toBe(2);

    loop.stop();
    await settle();
    loop.start();
    expect(workers.length).toBe(3);
    expect(workers[2].request?.seconds).toBe(3);

    workers[2].respond();
    await settle();
    expect(store.state().time).toBe(saved.time + 103);
  });

  it('fasst die Nachberechnungen bis zum Verwerfen zusammen', async () => {
    const saved = newGame(PROTOTYPE_GAME_CONFIG, 7, 1_000_000 - 3_600_000);
    useWorker = true;
    restartWith(serializeGame(saved));
    loop.start();

    visibility.setHidden(true);
    wallNow += 90_000;
    visibility.setHidden(false);
    workers[0].respond();
    await settle();
    workers[1].respond();
    await settle();

    expect(loop.catchUpSummary()).toMatchObject({ seconds: 3690, steps: 14760 });

    loop.dismissCatchUpSummary();
    visibility.setHidden(true);
    wallNow += 30_000;
    visibility.setHidden(false);
    workers[2].respond();
    await settle();
    expect(loop.catchUpSummary()).toBeNull();
  });
});
