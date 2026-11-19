import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { evolve } from '@app/genome/domain/genome-logic';
import type { GenomeNodeId } from '@app/genome/domain/models/genome.model';
import { setAutoMove } from '@app/site/domain/auto-move-logic';
import type { StrategyId } from '@app/site/domain/models/auto-move.model';
import { depart } from '@app/site/domain/move-logic';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { UnitType } from '@app/swarm/domain/models/units.model';
import { setPheromones, strengthenGland } from '@app/swarm/domain/pheromone-logic';
import { convertDronesToQueen, sacrificeDrones } from '@app/swarm/domain/sacrifice-logic';
import { setTransportPriority } from '@app/swarm/domain/transport-logic';
import { buyUnit } from '@app/swarm/domain/units-logic';

import type { GameEvent, StepResult } from './models/game-event.model';
import type { GameState } from './models/game-state.model';
import { stateModifiers } from './modifiers-logic';

/** Kommando ohne Wirkung. */
export interface NoopCommand {
  readonly type: 'noop';
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

/**
 * Verteilt die Pheromonpunkte (Game-Design §4.15): ganze Zahlen ≥ 0 mit `drones + soldiers ≤ P_ges`,
 * sonst ohne Wirkung. Kostenlos, auch während einer Reise.
 */
export interface SetPheromonesCommand {
  readonly type: 'setPheromones';
  readonly drones: number;
  readonly soldiers: number;
}

/** Kauft einen Drüsenpunkt für `Preis_P` Nahrung; der neue Punkt ist frei (Game-Design §4.15). */
export interface StrengthenGlandCommand {
  readonly type: 'strengthenGland';
}

/**
 * Entwickelt einen regulären Genom-Knoten für DNA (Game-Design §4.14); auch während einer Reise.
 * Meldet `evolved`; ohne Wirkung, wenn er schon entwickelt ist, der Vorgänger fehlt oder die DNA nicht reicht.
 */
export interface EvolveCommand {
  readonly type: 'evolve';
  readonly node: GenomeNodeId;
}

/** Alle Kommandos; neue Varianten hier ergänzen und in {@link applyCommand} behandeln. */
export type Command =
  | NoopCommand
  | BuyCommand
  | SacrificeDronesCommand
  | ConvertDronesToQueenCommand
  | SetTransportPriorityCommand
  | DepartCommand
  | SetAutoMoveCommand
  | SetPheromonesCommand
  | StrengthenGlandCommand
  | EvolveCommand;

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
    case 'buy':
      return withoutEvents(buyUnit(state, cmd.unit, params));
    case 'sacrificeDrones':
      return withoutEvents(
        sacrificeDrones(state, cmd.count, params, stateModifiers(state, params)),
      );
    case 'convertDronesToQueen':
      return withoutEvents(convertDronesToQueen(state, params, stateModifiers(state, params)));
    case 'setTransportPriority':
      return withoutEvents(setTransportPriority(state, cmd.priority));
    case 'depart':
      return depart(state, cmd.target, false, params, stateModifiers(state, params));
    case 'setAutoMove': {
      const { enabled, strategy, threshold } = cmd;
      return withoutEvents(setAutoMove(state, { enabled, strategy, threshold }, params));
    }
    case 'setPheromones':
      return withoutEvents(
        setPheromones(state, cmd.drones, cmd.soldiers, params, stateModifiers(state, params)),
      );
    case 'strengthenGland':
      return withoutEvents(strengthenGland(state, params));
    case 'evolve':
      return evolve(state, cmd.node, params);
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
