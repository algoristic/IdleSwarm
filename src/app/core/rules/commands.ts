import type { GameState } from '../state/game-state';

/** Kommando ohne Wirkung. */
export interface NoopCommand {
  readonly type: 'noop';
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link apply} behandeln. */
export type Command = NoopCommand;

/** Fehlt in {@link apply} ein Fall, schlägt der Aufruf hier beim Kompilieren fehl. */
function assertNever(type: never): never {
  throw new TypeError(`Unbekanntes Kommando: ${String(type)}`);
}

/** Wendet ein Kommando an, ohne den Eingabezustand zu verändern. */
export function apply(state: GameState, cmd: Command): GameState {
  switch (cmd.type) {
    case 'noop':
      return state;
    default:
      return assertNever(cmd.type);
  }
}
