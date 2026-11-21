import { TestBed } from '@angular/core/testing';

import { DEFAULT_BALANCE, TICK_MS } from '@app/balance/domain/constants';
import { maxCatchUpMs } from '@app/balance/domain/formulas';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import { SIMULATION_TEST_TIMEOUT_MS } from '../../domain/simulation-timeout.testing';
import { GameStore } from '../game-store/game-store.service';
import { GameLoop, MAX_TICKS_PER_WAKE } from './game-loop.service';

const NOW = 1_700_000_000_000;
const MAX_CATCH_UP_MS = maxCatchUpMs(DEFAULT_BALANCE);

describe('GameLoop', () => {
  let loop: GameLoop;
  let store: GameStore;
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
    TestBed.configureTestingModule({ providers: [GameStore, GameLoop] });
    loop = TestBed.inject(GameLoop);
    store = TestBed.inject(GameStore);
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

    it('holt einen großen Rückstand nach Rückkehr in den Tab in groben Schritten nach', () => {
      loop.start();
      const startNow = store.state().time.now;
      const tick = vi.spyOn(store, 'tick');
      const catchUp = vi.spyOn(store, 'catchUp');
      setHidden(true);
      // Gedrosselter oder eingefrorener Timer: eine Stunde ohne Aufwachen.
      wake(MS_PER_HOUR + 50);
      expect(played()).toBe(MS_PER_HOUR);
      expect(store.state().time.now).toBe(startNow + MS_PER_HOUR);
      expect(tick).not.toHaveBeenCalled();
      expect(catchUp).toHaveBeenCalledExactlyOnceWith(MS_PER_HOUR, 'background');
      expect(store.lastCatchUp()).toMatchObject({
        source: 'background',
        requestedMs: MS_PER_HOUR,
        caughtUpMs: MS_PER_HOUR,
        capped: false,
      });
      setHidden(false);
      wake(50);
      expect(played()).toBe(MS_PER_HOUR + 100);
    });

    it(
      'teilt das Nachholen wie der Runner, damit das Auto-Weiterziehen rechtzeitig aufbricht',
      { timeout: SIMULATION_TEST_TIMEOUT_MS },
      () => {
        const base = store.state();
        // Viele Drohnen leeren die Startstelle schnell, genug Königinnen nehmen sie mit; das
        // Auto-Weiterziehen zieht mehrmals weiter.
        const fresh = {
          ...base,
          auto: { ...base.auto, enabled: true },
          units: { ...base.units, queens: Num.from(40), drones: Num.from(1000) },
        };
        store.replace(fresh);
        loop.start();
        wake(MS_PER_HOUR);
        const caughtUp = store.state();

        // Dieselbe Zeit Tick für Tick: gleiche Zahl an Aufbrüchen bzw. Ankünften.
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({ providers: [GameStore] });
        const reference = TestBed.inject(GameStore);
        reference.replace(fresh);
        for (let i = 0; i < MS_PER_HOUR / TICK_MS; i++) {
          reference.tick(TICK_MS);
        }
        expect(caughtUp.map.route.length).toBeGreaterThan(2);
        expect(caughtUp.map.route.length).toBe(reference.state().map.route.length);
        const food = reference.state().res.food.toNumber();
        expect(Math.abs(caughtUp.res.food.toNumber() - food)).toBeLessThanOrEqual(food * 0.02 + 1);
      },
    );

    it(
      'deckelt das Nachholen, verwirft den Rest und gleicht die Uhr ab',
      { timeout: SIMULATION_TEST_TIMEOUT_MS },
      () => {
        loop.start();
        vi.setSystemTime(NOW + MAX_CATCH_UP_MS + MS_PER_HOUR);
        wake(MAX_CATCH_UP_MS + MS_PER_HOUR + 50);
        expect(played()).toBe(MAX_CATCH_UP_MS);
        expect(store.state().time.now).toBe(Date.now());
        expect(store.lastCatchUp()).toMatchObject({ capped: true, discardedMs: MS_PER_HOUR });
        wake(99);
        expect(played()).toBe(MAX_CATCH_UP_MS);
        wake(1);
        expect(played()).toBe(MAX_CATCH_UP_MS + 100);
      },
    );

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
