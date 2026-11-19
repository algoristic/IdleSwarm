import type { BalanceParams } from '@app/balance/domain/constants';
import { carriedUnits } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';

import { isTransportPriority, TransportPriority } from './models/transport-priority.model';
import type { Units } from './models/units.model';

/** Ergebnis des Transports beim Aufbruch (Game-Design §4.9); wird abgeleitet, nicht gespeichert. */
export interface TransportResult {
  /** `Q`, `D'`, `S'`. */
  readonly carried: Units;
  /** `D − D'`, `S − S'`; Königinnen bleiben nie zurück (immer 0). */
  readonly leftBehind: Units;
  /** `true`, wenn alle Einheiten mitkommen (`O ≤ C`). */
  readonly fitsAll: boolean;
}

/** Plant den Transport, ohne den Zustand zu ändern (Anzeige vor dem Aufbruch, US-04.06). */
export function planTransport(
  units: Units,
  priority: TransportPriority,
  params: BalanceParams,
  modifiers: Modifiers,
): TransportResult {
  const carried = carriedUnits(units, priority, params, modifiers);
  return {
    carried,
    leftBehind: {
      queens: units.queens.sub(carried.queens),
      drones: units.drones.sub(carried.drones),
      soldiers: units.soldiers.sub(carried.soldiers),
    },
    fitsAll: carried === units,
  };
}

/**
 * Wendet den Transport mit der Priorität aus dem Zustand an: Zurückgelassene gehen ohne Rückerstattung
 * verloren (Game-Design §4.11, Aufbruch). Passt alles, kommt derselbe Zustand zurück.
 */
export function applyTransport(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
): GameState {
  const carried = carriedUnits(state.units, state.priority, params, modifiers);
  return carried === state.units ? state : { ...state, units: carried };
}

/** Setzt die Mitnahme-Priorität; eine unbekannte oder unveränderte ID lässt den Zustand unverändert. */
export function setTransportPriority(state: GameState, priority: TransportPriority): GameState {
  return isTransportPriority(priority) && priority !== state.priority
    ? { ...state, priority }
    : state;
}
