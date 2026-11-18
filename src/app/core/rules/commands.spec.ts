import { createInitialState } from '../state/game-state';
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
});
