import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';

import { apply, applyCommand, Command } from './commands-logic';
import { createInitialState } from './game-state-logic';
import { GameState } from './models/game-state.model';

describe('apply', () => {
  const state = Object.freeze(createInitialState({ seed: 'idleswarm', now: 1000 }));

  it('gibt bei noop dieselbe Referenz zurück', () => {
    expect(apply(state, { type: 'noop' })).toBe(state);
  });

  it('weist unbekannte Kommandos beim Kompilieren und zur Laufzeit ab', () => {
    // @ts-expect-error: `unknown` gehört nicht zur Union `Command`.
    const cmd: Command = { type: 'unknown' };
    expect(() => apply(state, cmd)).toThrow(new TypeError('Unbekanntes Kommando: unknown'));
  });

  function withStock(stock: Num | number, size: Num | number = 20000): GameState {
    return Object.freeze({
      ...state,
      site: Object.freeze({
        ...state.site,
        size: Num.from(size),
        stock: Num.from(stock),
      }),
    });
  }

  describe('newSite', () => {
    it('füllt den leeren Vorrat auf die Größe auf', () => {
      const empty = withStock(0, 500);
      const next = apply(empty, { type: 'newSite' });
      expect(next.site.stock.eq(500)).toBe(true);
      expect(next.site.size).toBe(empty.site.size);
      expect(next.site.type).toBe('vent');
    });

    it('erhält Einheiten, Nahrung und Kaufzähler', () => {
      const empty = withStock(0);
      const next = apply(empty, { type: 'newSite' });
      expect(next.res).toBe(empty.res);
      expect(next.units).toBe(empty.units);
      expect(next.bought).toBe(empty.bought);
    });

    it('richtet sich nach der Größe im Zustand, nicht nach den Parametern', () => {
      const params = { ...DEFAULT_BALANCE, siteSize: 7 };
      expect(apply(withStock(0, 500), { type: 'newSite' }, params).site.stock.eq(500)).toBe(true);
    });

    it.each([1e-9, 1, 20000])('gibt beim Vorrat %d denselben Zustand zurück', (stock) => {
      const current = withStock(stock);
      expect(apply(current, { type: 'newSite' })).toBe(current);
    });

    it('gibt bei einer Futterstelle der Größe 0 denselben Zustand zurück', () => {
      const current = withStock(0, 0);
      expect(apply(current, { type: 'newSite' })).toBe(current);
    });
  });
  describe('sacrificeDrones', () => {
    const withDrones = Object.freeze({
      ...state,
      units: Object.freeze({ ...state.units, drones: Num.from(10) }),
    });

    it('opfert Drohnen für Nahrung (Beispiel 6)', () => {
      const next = apply(withDrones, { type: 'sacrificeDrones', count: 10 });
      expect(next.units.drones.isZero()).toBe(true);
      expect(next.res.food.eq(withDrones.res.food.add(50))).toBe(true);
      expect(withDrones.units.drones.eq(10)).toBe(true);
    });

    it.each([0, -3, NaN])('gibt bei count = %d denselben Zustand zurück', (count) => {
      expect(apply(withDrones, { type: 'sacrificeDrones', count })).toBe(withDrones);
    });
  });

  describe('convertDronesToQueen', () => {
    it('wandelt 12 Drohnen in eine Königin um', () => {
      const current = Object.freeze({
        ...state,
        units: Object.freeze({ ...state.units, drones: Num.from(12) }),
      });
      const next = apply(current, { type: 'convertDronesToQueen' });
      expect(next.units.queens.eq(state.units.queens.add(1))).toBe(true);
      expect(next.units.drones.toNumber()).toBeCloseTo(0, 12);
      expect(next.bought.queens.eq(1)).toBe(true);
    });

    it('gibt ohne genug Drohnen denselben Zustand zurück', () => {
      expect(apply(state, { type: 'convertDronesToQueen' })).toBe(state);
    });
  });

  describe('setTransportPriority', () => {
    it('setzt die Priorität', () => {
      const next = apply(state, { type: 'setTransportPriority', priority: 'soldiers-first' });
      expect(next.priority).toBe('soldiers-first');
      expect(state.priority).toBe('balanced');
    });

    it('gibt bei unbekannter ID denselben Zustand zurück', () => {
      // @ts-expect-error: `queens-first` ist keine Mitnahme-Priorität.
      const cmd: Command = { type: 'setTransportPriority', priority: 'queens-first' };
      expect(apply(state, cmd)).toBe(state);
    });
  });

  describe('depart', () => {
    // Der Seed „idleswarm“ erzeugt als ersten Kandidaten eine Algenmatte bei (−1,3355; −2,3790).
    const travelMs = Math.hypot(1.3355202136, 2.3790464258) * 10_000;

    it('bricht auf und meldet departed mit Auslöser manuell', () => {
      const { state: next, events } = applyCommand(state, { type: 'depart', target: 0 });
      expect(next.travel?.target).toBe(state.map.candidates[0]);
      expect(next.travel?.remainingMs).toBeCloseTo(travelMs, 4);
      expect(next.site.stock.isZero()).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'departed',
        playedMs: 0,
        siteType: 'algal-mat',
        auto: false,
      });
    });

    it('liefert über apply denselben Zustand ohne Ereignisse', () => {
      expect(apply(state, { type: 'depart', target: 0 })).toEqual(
        applyCommand(state, { type: 'depart', target: 0 }).state,
      );
    });

    it.each([-1, 6, 0.5, Number.NaN])('bleibt beim Ziel %d ohne Wirkung', (target) => {
      expect(applyCommand(state, { type: 'depart', target })).toEqual({ state, events: [] });
      expect(apply(state, { type: 'depart', target })).toBe(state);
    });

    it('bleibt während einer Reise ohne Wirkung, auch für „Neue Futterstelle“', () => {
      const traveling = Object.freeze(apply(state, { type: 'depart', target: 0 }));
      expect(apply(traveling, { type: 'depart', target: 0 })).toBe(traveling);
      expect(apply(traveling, { type: 'newSite' })).toBe(traveling);
    });

    it('liefert für Kommandos ohne Ereignis eine leere Liste', () => {
      expect(applyCommand(state, { type: 'buy', unit: 'drones' }).events).toEqual([]);
    });
  });

  describe('setAutoMove', () => {
    it('setzt die Einstellungen und begrenzt die Schwelle', () => {
      const next = apply(
        state,
        { type: 'setAutoMove', enabled: true, strategy: 'least-resistance', threshold: 2 },
        DEFAULT_BALANCE,
      );
      expect(next.auto).toEqual({ enabled: true, strategy: 'least-resistance', threshold: 0.9 });
    });

    it('bleibt bei ungültigen Werten ohne Wirkung', () => {
      // @ts-expect-error: `greedy` ist keine Strategie.
      const cmd: Command = { type: 'setAutoMove', strategy: 'greedy' };
      expect(apply(state, cmd)).toBe(state);
      expect(apply(state, { type: 'setAutoMove', threshold: Number.NaN })).toBe(state);
    });
  });
});
