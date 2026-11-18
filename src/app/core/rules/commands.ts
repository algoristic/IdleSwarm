import { BalanceParams, DEFAULT_BALANCE } from '../balance/constants';
import type { GameState } from '../state/game-state';
import { clickSite, renewSite } from './site';

/** Kommando ohne Wirkung. */
export interface NoopCommand {
  readonly type: 'noop';
}

/** Klick auf die Futterstelle. */
export interface ClickCommand {
  readonly type: 'click';
}

/** Füllt die leere Futterstelle wieder auf (Provisorium bis M1.2). */
export interface NewSiteCommand {
  readonly type: 'newSite';
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link apply} behandeln. */
export type Command = NoopCommand | ClickCommand | NewSiteCommand;

/** Fehlt in {@link apply} ein Fall, schlägt der Aufruf hier beim Kompilieren fehl. */
function assertNever(type: never): never {
  throw new TypeError(`Unbekanntes Kommando: ${String(type)}`);
}

/**
 * Wendet ein Kommando an, ohne den Eingabezustand zu verändern. Bleibt es ohne Wirkung, kommt
 * derselbe Zustand zurück.
 */
export function apply(
  state: GameState,
  cmd: Command,
  params: BalanceParams = DEFAULT_BALANCE,
): GameState {
  const { type } = cmd;
  switch (type) {
    case 'noop':
      return state;
    case 'click':
      return clickSite(state, params);
    case 'newSite':
      return renewSite(state);
    default:
      return assertNever(type);
  }
}
