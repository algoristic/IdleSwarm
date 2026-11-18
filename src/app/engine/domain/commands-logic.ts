import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { renewSite } from '@app/site/domain/site-logic';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { buyUnit } from '@app/swarm/domain/units-logic';

import type { GameState } from './models/game-state.model';

/** Kommando ohne Wirkung. */
export interface NoopCommand {
  readonly type: 'noop';
}

/** Füllt die leere Futterstelle wieder auf (Provisorium bis M1.2). */
export interface NewSiteCommand {
  readonly type: 'newSite';
}

/** Kauft eine Einheit des angegebenen Typs. */
export interface BuyCommand {
  readonly type: 'buy';
  readonly unit: UnitType;
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link apply} behandeln. */
export type Command = NoopCommand | NewSiteCommand | BuyCommand;

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
    case 'newSite':
      return renewSite(state);
    case 'buy':
      return buyUnit(state, cmd.unit, params);
    default:
      return assertNever(type);
  }
}
