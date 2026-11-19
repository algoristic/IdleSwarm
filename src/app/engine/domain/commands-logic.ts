import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { setAutoMove } from '@app/site/domain/auto-move-logic';
import type { StrategyId } from '@app/site/domain/models/auto-move.model';
import { depart } from '@app/site/domain/move-logic';
import { renewSite } from '@app/site/domain/site-logic';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { convertDronesToQueen, sacrificeDrones } from '@app/swarm/domain/sacrifice-logic';
import { setTransportPriority } from '@app/swarm/domain/transport-logic';
import { buyUnit } from '@app/swarm/domain/units-logic';

import type { GameEvent, StepResult } from './models/game-event.model';
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

/**
 * Bricht zum Kandidaten `target` (Index in `map.candidates`) auf (Game-Design §4.11); nur ohne
 * laufende Reise, in Reichweite und wenn das Ziel einnehmbar ist.
 */
export interface DepartCommand {
  readonly type: 'depart';
  readonly target: number;
}

/**
 * Ändert die Einstellungen des Auto-Weiterziehens (Game-Design §4.12); fehlende Felder bleiben.
 * Die Schwelle wird auf `[0; θ_max]` begrenzt; ist ein Feld ungültig, bleibt das Kommando ohne Wirkung.
 */
export interface SetAutoMoveCommand {
  readonly type: 'setAutoMove';
  readonly enabled?: boolean;
  readonly strategy?: StrategyId;
  readonly threshold?: number;
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link applyCommand} behandeln. */
export type Command =
  | NoopCommand
  | NewSiteCommand
  | BuyCommand
  | SacrificeDronesCommand
  | ConvertDronesToQueenCommand
  | SetTransportPriorityCommand
  | DepartCommand
  | SetAutoMoveCommand;

const NO_EVENTS: readonly GameEvent[] = Object.freeze([]);

function withoutEvents(state: GameState): StepResult {
  return { state, events: NO_EVENTS };
}

/** Fehlt in {@link applyCommand} ein Fall, schlägt der Aufruf hier beim Kompilieren fehl. */
function assertNever(type: never): never {
  throw new TypeError(`Unbekanntes Kommando: ${String(type)}`);
}

/**
 * Wendet ein Kommando an, ohne den Eingabezustand zu verändern, und liefert die Ereignisse dazu
 * (z. B. `departed`). Bleibt es ohne Wirkung, kommt derselbe Zustand ohne Ereignisse zurück.
 */
export function applyCommand(
  state: GameState,
  cmd: Command,
  params: BalanceParams = DEFAULT_BALANCE,
): StepResult {
  const { type } = cmd;
  switch (type) {
    case 'noop':
      return withoutEvents(state);
    case 'newSite':
      return withoutEvents(renewSite(state));
    case 'buy':
      return withoutEvents(buyUnit(state, cmd.unit, params));
    case 'sacrificeDrones':
      return withoutEvents(sacrificeDrones(state, cmd.count, params));
    case 'convertDronesToQueen':
      return withoutEvents(convertDronesToQueen(state, params));
    case 'setTransportPriority':
      return withoutEvents(setTransportPriority(state, cmd.priority));
    case 'depart':
      return depart(state, cmd.target, false, params);
    case 'setAutoMove': {
      const { enabled, strategy, threshold } = cmd;
      return withoutEvents(setAutoMove(state, { enabled, strategy, threshold }, params));
    }
    default:
      return assertNever(type);
  }
}

/**
 * Wendet ein Kommando an und liefert nur den Zustand; Ereignisse verwirft es. Bleibt das Kommando
 * ohne Wirkung, kommt derselbe Zustand zurück.
 */
export function apply(
  state: GameState,
  cmd: Command,
  params: BalanceParams = DEFAULT_BALANCE,
): GameState {
  return applyCommand(state, cmd, params).state;
}
