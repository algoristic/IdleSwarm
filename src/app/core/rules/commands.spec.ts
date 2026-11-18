import { DEFAULT_BALANCE } from '../balance/constants';
import { Num } from '../num/num';
import { createInitialState, GameState } from '../state/game-state';
import { apply, Command } from './commands';

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

  describe('click', () => {
    it('überträgt den Klickertrag vom Vorrat in die Nahrung', () => {
      const next = apply(state, { type: 'click' });
      expect(next.res.food.eq(16)).toBe(true);
      expect(next.site.stock.eq(19999)).toBe(true);
    });

    it('verändert nur Nahrung und Vorrat', () => {
      const next = apply(state, { type: 'click' });
      expect(next).not.toBe(state);
      expect(next.units).toBe(state.units);
      expect(next.bought).toBe(state.bought);
      expect(next.time).toBe(state.time);
      expect(next.res.dna).toBe(state.res.dna);
      expect(next.site.size).toBe(state.site.size);
      expect(state.res.food.eq(15)).toBe(true);
      expect(state.site.stock.eq(20000)).toBe(true);
    });

    it('nutzt den überschriebenen Klickertrag', () => {
      const next = apply(state, { type: 'click' }, { ...DEFAULT_BALANCE, clickYield: 2.5 });
      expect(next.res.food.eq(17.5)).toBe(true);
      expect(next.site.stock.eq(19997.5)).toBe(true);
    });

    it('nimmt höchstens den Rest und leert den Vorrat exakt', () => {
      const next = apply(withStock(0.4), { type: 'click' });
      expect(next.res.food.eq(15.4)).toBe(true);
      expect(next.site.stock).toBe(Num.ZERO);
    });

    it('leert den Vorrat exakt, wenn er dem Ertrag entspricht', () => {
      expect(apply(withStock(1), { type: 'click' }).site.stock).toBe(Num.ZERO);
    });

    it('endet auch bei gebrochenem Ertrag ohne Rundungsrest', () => {
      const params = { ...DEFAULT_BALANCE, clickYield: 0.1 };
      let current = withStock(1000);
      let clicks = 0;
      while (!current.site.stock.isZero() && clicks < 10_100) {
        current = apply(current, { type: 'click' }, params);
        clicks++;
      }
      expect(current.site.stock).toBe(Num.ZERO);
      expect(current.res.food.sub(1015).abs().lt(1e-6)).toBe(true);
    });

    it('gibt bei leerem Vorrat denselben Zustand zurück', () => {
      const empty = withStock(0);
      expect(apply(empty, { type: 'click' })).toBe(empty);
    });

    it.each([0, -1])('gibt beim Klickertrag %d denselben Zustand zurück', (clickYield) => {
      expect(apply(state, { type: 'click' }, { ...DEFAULT_BALANCE, clickYield })).toBe(state);
    });
  });

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
});
