import { TestBed } from '@angular/core/testing';

import { TICK_MS } from '../core/balance/constants';
import { GameLoopService, MAX_TICKS_PER_WAKE } from './game-loop.service';
import { GameStoreService } from './game-store.service';

const NOW = 1_700_000_000_000;

describe('GameLoopService', () => {
  let loop: GameLoopService;
  let store: GameStoreService;
  let perfNow: number;
  let frames: Map<number, FrameRequestCallback>;

  /** Lässt `elapsedMs` Messzeit vergehen und den Timer genau einmal feuern. */
  function wake(elapsedMs: number): void {
    perfNow += elapsedMs;
    vi.advanceTimersByTime(TICK_MS);
  }

  function runFrame(): void {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((frame) => frame(perfNow));
  }

  function setHidden(hidden: boolean): void {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    document.dispatchEvent(new Event('visibilitychange'));
  }

  const played = () => store.state().time.played;

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], now: NOW });
    perfNow = 1000;
    vi.spyOn(performance, 'now').mockImplementation(() => perfNow);
    frames = new Map();
    let nextFrame = 0;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.stubGlobal('cancelAnimationFrame', (handle: number) => frames.delete(handle));
    loop = TestBed.inject(GameLoopService);
    store = TestBed.inject(GameStoreService);
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    delete (document as { hidden?: boolean }).hidden;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Logik-Takt', () => {
    it('läuft bei unregelmäßigem Timer die genaue Tick-Zahl und behält den Rest', () => {
      loop.start();
      wake(130);
      expect(played()).toBe(100);
      wake(40);
      expect(played()).toBe(100);
      wake(250);
      expect(played()).toBe(400);
      wake(5);
      expect(played()).toBe(400);
      wake(74);
      expect(played()).toBe(400);
      wake(1);
      expect(played()).toBe(500);
    });

    it('läuft bei verborgener Seite weiter', () => {
      loop.start();
      setHidden(true);
      wake(1000);
      expect(played()).toBe(1000);
    });

    it('holt genau die Obergrenze ohne Verwerfen nach', () => {
      loop.start();
      const startNow = store.state().time.now;
      wake(MAX_TICKS_PER_WAKE * TICK_MS + 50);
      expect(played()).toBe(60_000);
      expect(store.state().time.now).toBe(startNow + 60_000);
      wake(50);
      expect(played()).toBe(60_100);
    });

    it('deckelt Zeitsprünge, verwirft den Rest und gleicht die Uhr ab', () => {
      loop.start();
      vi.setSystemTime(NOW + 3_600_000);
      wake(3_600_050);
      expect(played()).toBe(60_000);
      expect(store.state().time.now).toBe(Date.now());
      wake(99);
      expect(played()).toBe(60_000);
      wake(1);
      expect(played()).toBe(60_100);
    });

    it('tickt nach stop nicht mehr', () => {
      loop.start();
      wake(100);
      loop.stop();
      wake(1000);
      expect(played()).toBe(100);
      expect(vi.getTimerCount()).toBe(0);
    });

    it('ist bei start und stop idempotent', () => {
      loop.start();
      loop.start();
      expect(vi.getTimerCount()).toBe(1);
      wake(100);
      expect(played()).toBe(100);
      loop.stop();
      loop.stop();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('zählt die Zeit zwischen stop und start nicht, gleicht aber die Uhr ab', () => {
      loop.start();
      loop.stop();
      perfNow += 5000;
      vi.setSystemTime(NOW + 5000);
      loop.start();
      expect(store.state().time.now).toBe(NOW + 5000);
      wake(100);
      expect(played()).toBe(100);
    });

    it('räumt beim Zerstören auf', () => {
      loop.start();
      loop.onRender(() => undefined);
      TestBed.resetTestingModule();
      expect(vi.getTimerCount()).toBe(0);
      expect(frames.size).toBe(0);
    });
  });

  describe('Render-Takt', () => {
    it('läuft nur mit angemeldetem Callback', () => {
      loop.start();
      expect(frames.size).toBe(0);
      const unregister = loop.onRender(() => undefined);
      expect(frames.size).toBe(1);
      runFrame();
      expect(frames.size).toBe(1);
      unregister();
      expect(frames.size).toBe(0);
    });

    it('läuft nur, solange der Logik-Takt läuft', () => {
      loop.onRender(() => undefined);
      expect(frames.size).toBe(0);
      loop.start();
      expect(frames.size).toBe(1);
      loop.stop();
      expect(frames.size).toBe(0);
    });

    it('meldet den Anteil am aktuellen Tick', () => {
      const callback = vi.fn();
      loop.start();
      loop.onRender(callback);
      wake(150);
      perfNow += 20;
      runFrame();
      expect(callback.mock.calls[0][0]).toBeCloseTo(0.7);
    });

    it('begrenzt den Anteil auf 1, wenn der Timer ausbleibt', () => {
      const callback = vi.fn();
      loop.start();
      loop.onRender(callback);
      perfNow += 5000;
      runFrame();
      expect(callback).toHaveBeenCalledWith(1);
    });

    it('ändert den Zustand nicht', () => {
      loop.start();
      loop.onRender(() => undefined);
      const before = store.state();
      perfNow += 500;
      runFrame();
      expect(store.state()).toBe(before);
    });

    it('pausiert bei verborgener Seite und setzt danach fort', () => {
      const callback = vi.fn();
      loop.start();
      loop.onRender(callback);
      setHidden(true);
      expect(frames.size).toBe(0);
      setHidden(false);
      expect(frames.size).toBe(1);
      runFrame();
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('fordert bei verborgener Seite auch für neue Callbacks keinen Frame an', () => {
      loop.start();
      setHidden(true);
      loop.onRender(() => undefined);
      expect(frames.size).toBe(0);
    });

    it('reagiert nach stop nicht mehr auf die Sichtbarkeit', () => {
      loop.start();
      loop.onRender(() => undefined);
      loop.stop();
      setHidden(true);
      setHidden(false);
      expect(frames.size).toBe(0);
    });

    it('überspringt Callbacks, die im selben Frame abgemeldet wurden', () => {
      const second = vi.fn();
      loop.start();
      let unregisterSecond: () => void = () => undefined;
      loop.onRender(() => unregisterSecond());
      unregisterSecond = loop.onRender(second);
      runFrame();
      expect(second).not.toHaveBeenCalled();
    });

    it('läuft weiter, wenn ein Callback wirft', () => {
      loop.start();
      loop.onRender(() => {
        throw new Error('kaputt');
      });
      expect(runFrame).toThrow('kaputt');
      expect(frames.size).toBe(1);
    });

    it('führt dieselbe Funktion je Anmeldung getrennt', () => {
      const callback = vi.fn();
      loop.start();
      const unregister = loop.onRender(callback);
      loop.onRender(callback);
      unregister();
      runFrame();
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
