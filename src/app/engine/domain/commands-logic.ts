import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { renewSite } from '@app/site/domain/site-logic';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { convertDronesToQueen, sacrificeDrones } from '@app/swarm/domain/sacrifice-logic';
import { setTransportPriority } from '@app/swarm/domain/transport-logic';
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

/** Opfert `count` Drohnen für Nahrung; `Infinity` opfert alle (Game-Design §4.10). */
export interface SacrificeDronesCommand {
  readonly type: 'sacrificeDrones';
  readonly count: number;
}

/** Wandelt Drohnen zum aktuellen Königinnenpreis in eine Königin um (Game-Design §4.10). */
export interface ConvertDronesToQueenCommand {
  readonly type: 'convertDronesToQueen';
}

/** Setzt die Mitnahme-Priorität beim Aufbruch (Game-Design §4.9). */
export interface SetTransportPriorityCommand {
  readonly type: 'setTransportPriority';
  readonly priority: TransportPriority;
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link apply} behandeln. */
export type Command =
  | NoopCommand
  | NewSiteCommand
  | BuyCommand
  | SacrificeDronesCommand
  | ConvertDronesToQueenCommand
  | SetTransportPriorityCommand;

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
    case 'sacrificeDrones':
      return sacrificeDrones(state, cmd.count, params);
    case 'convertDronesToQueen':
      return convertDronesToQueen(state, params);
    case 'setTransportPriority':
      return setTransportPriority(state, cmd.priority);
    default:
      return assertNever(type);
  }
}
