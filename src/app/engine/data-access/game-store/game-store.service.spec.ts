import { TestBed } from '@angular/core/testing';

import { DEFAULT_BALANCE, TICK_MS } from '@app/balance/domain/constants';
import { NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_MINUTE } from '@app/shared/util/time/time-units';
import { canDepart } from '@app/site/domain/move-logic';

import { Command } from '../../domain/commands-logic';
import { createInitialState } from '../../domain/game-state-logic';
import { createNewGame, createSeed, GameStore, LOG_MAX_ENTRIES } from './game-store.service';

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

  describe('Log', () => {
    /** Ein Zustand, dessen Vorrat im nächsten Tick leer wird (`siteDepleted`). */
    function almostEmpty(state: GameState = store.state()): GameState {
      return { ...state, site: { ...state.site, stock: Num.from(0.01) } };
    }

    /** Ein Schwarm, der jedes Ziel in Reichweite einnehmen kann. */
    function strong(state: GameState = store.state()): GameState {
      return { ...state, units: { ...state.units, soldiers: Num.from(1e6) } };
    }

    function reachableTarget(state: GameState): number {
      const index = state.map.candidates.findIndex((_, i) =>
        canDepart(state, i, DEFAULT_BALANCE, NEUTRAL_MODIFIERS),
      );
      expect(index).toBeGreaterThanOrEqual(0);
      return index;
    }

    it('startet leer und bleibt ohne Ereignisse unverändert', () => {
      const before = store.log();
      expect(before).toEqual([]);
      store.tick(TICK_MS);
      store.dispatch({ type: 'noop' });
      expect(store.log()).toBe(before);
    });

    it('nimmt Ereignisse aus Ticks auf, die Rückgabe von tick bleibt', () => {
      store.replace(almostEmpty());
      const events = store.tick(TICK_MS);
      // Das neue Spiel hat einen zufälligen Seed; Funde an den Abbau-Schwellen sind möglich.
      expect(events.map((e) => e.type).filter((type) => type !== 'found')).toEqual([
        'siteDepleted',
      ]);
      expect(store.log().map((entry) => entry.event)).toEqual(events);
    });

    it('nimmt Ereignisse aus Kommandos auf', () => {
      store.replace(strong());
      store.dispatch({ type: 'depart', target: reachableTarget(store.state()) });
      expect(store.state().travel).not.toBeNull();
      expect(store.log().map((entry) => entry.event.type)).toEqual(['departed']);
    });

    it('hält die Reihenfolge, älteste zuerst, mit fortlaufenden IDs', () => {
      store.replace(almostEmpty(strong()));
      store.tick(TICK_MS);
      store.dispatch({ type: 'depart', target: reachableTarget(store.state()) });
      const log = store.log();
      const moves = log.filter((entry) => entry.event.type !== 'found');
      expect(moves.map((entry) => entry.event.type)).toEqual(['siteDepleted', 'departed']);
      expect(moves[1].id).toBeGreaterThan(moves[0].id);
      expect(log.map((entry) => entry.id)).toEqual(
        [...log.map((entry) => entry.id)].sort((x, y) => x - y),
      );
    });

    it('behält höchstens die letzten Einträge', () => {
      // Je Tick mindestens `siteDepleted`, dazu ggf. Funde an den Abbau-Schwellen.
      let total = 0;
      while (total < LOG_MAX_ENTRIES + 5) {
        store.replace(almostEmpty());
        total += store.tick(TICK_MS).length;
      }
      const log = store.log();
      expect(log).toHaveLength(LOG_MAX_ENTRIES);
      // Die ältesten sind herausgefallen, die neuesten stehen am Ende.
      expect(log[0].id).toBe(total - LOG_MAX_ENTRIES);
      expect(log[LOG_MAX_ENTRIES - 1].id).toBe(total - 1);
    });

    it('leert sich mit load immer, auch bei gleichem Seed und späterem Stand', () => {
      store.replace(almostEmpty());
      store.tick(TICK_MS);
      const state = store.state();
      const lastId = store.log()[0].id;

      store.load({ ...state, time: { ...state.time, played: state.time.played + 5000 } });
      expect(store.log()).toEqual([]);
      expect(store.state().time.played).toBe(state.time.played + 5000);

      // Die IDs zählen weiter, damit track keine alten Einträge wiedererkennt.
      store.replace(almostEmpty());
      store.tick(TICK_MS);
      expect(store.log()[0].id).toBeGreaterThan(lastId);
    });

    it('bleibt mit replace immer erhalten, auch bei einem anderen Seed', () => {
      store.replace(almostEmpty());
      store.tick(TICK_MS);
      const log = store.log();
      const state = store.state();

      store.replace({ ...state, time: { ...state.time, now: state.time.now + 5000 } });
      store.replace({ ...state, time: { ...state.time, played: 0 } });
      const other = createInitialState({ seed: 'anderes', now: 1 });
      store.replace(other);

      expect(store.state()).toBe(other);
      expect(store.log()).toBe(log);
    });
  });

  describe('Nachholen', () => {
    it('holt nach, schreibt Ereignisse ins Log und hält die Zusammenfassung', () => {
      const fresh = store.state();
      store.replace({ ...fresh, site: { ...fresh.site, stock: Num.from(0.01) } });
      const before = store.state();

      const summary = store.catchUp(10 * MS_PER_MINUTE, 'load');

      expect(store.state().time.played).toBe(before.time.played + 10 * MS_PER_MINUTE);
      expect(store.log().some((entry) => entry.event.type === 'siteDepleted')).toBe(true);
      expect(store.lastCatchUp()).toBe(summary);
      expect(summary).toMatchObject({ source: 'load', caughtUpMs: 10 * MS_PER_MINUTE });
    });

    it('quittiert die Zusammenfassung', () => {
      store.catchUp(10 * MS_PER_MINUTE, 'load');
      store.acknowledgeCatchUp();
      expect(store.lastCatchUp()).toBeNull();
    });

    it('fasst mit einer offenen Rückkehr-Zusammenfassung zusammen, sonst ersetzt es', () => {
      store.catchUp(10 * MS_PER_MINUTE, 'load');
      store.catchUp(2 * MS_PER_MINUTE, 'background');
      expect(store.lastCatchUp()).toMatchObject({
        source: 'load',
        requestedMs: 12 * MS_PER_MINUTE,
      });

      store.acknowledgeCatchUp();
      store.catchUp(2 * MS_PER_MINUTE, 'background');
      store.catchUp(3 * MS_PER_MINUTE, 'background');
      expect(store.lastCatchUp()).toMatchObject({ requestedMs: 3 * MS_PER_MINUTE });
    });

    it('verwirft die Zusammenfassung mit load', () => {
      store.catchUp(10 * MS_PER_MINUTE, 'load');
      store.load(createInitialState({ seed: 'neu', now: 1 }));
      expect(store.lastCatchUp()).toBeNull();
    });
  });
});
