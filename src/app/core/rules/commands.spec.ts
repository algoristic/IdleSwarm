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
