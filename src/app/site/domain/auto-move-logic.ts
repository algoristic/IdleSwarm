import type { BalanceParams } from '@app/balance/domain/constants';
import { clampAutoThreshold } from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';

import { type AutoMove, isStrategyId } from './models/auto-move.model';
import type { SiteResult } from './models/site-event.model';
import { depart } from './move-logic';
import { strategyTarget } from './strategy-logic';

/**
 * Ändert die Einstellungen des Auto-Weiterziehens; fehlende Felder bleiben, die Schwelle wird auf
 * `[0; θ_max]` begrenzt. Ist ein angegebenes Feld ungültig oder ändert sich nichts, kommt derselbe
 * Zustand zurück.
 */
export function setAutoMove(
  state: GameState,
  settings: Partial<AutoMove>,
  params: BalanceParams,
): GameState {
  const { enabled, strategy, threshold } = settings;
  if (
    (enabled !== undefined && typeof enabled !== 'boolean') ||
    (strategy !== undefined && !isStrategyId(strategy)) ||
    (threshold !== undefined && (typeof threshold !== 'number' || Number.isNaN(threshold)))
  ) {
    return state;
  }
  const { auto } = state;
  const next: AutoMove = {
    enabled: enabled ?? auto.enabled,
    strategy: strategy ?? auto.strategy,
    threshold: threshold === undefined ? auto.threshold : clampAutoThreshold(threshold, params),
  };
  const unchanged =
    next.enabled === auto.enabled &&
    next.strategy === auto.strategy &&
    next.threshold === auto.threshold;
  return unchanged ? state : { ...state, auto: next };
}

/**
 * Auslöser des Auto-Weiterziehens: Auto an, keine Reise, `V ≤ θ · G` (Game-Design §4.12). Ein
 * geladener Spielstand darf eine Schwelle über `θ_max` haben; wirksam ist höchstens `θ_max`, der
 * gespeicherte Wert bleibt.
 */
export function isAutoMoveDue(state: GameState, params: BalanceParams): boolean {
  const { auto, site, travel } = state;
  const threshold = clampAutoThreshold(auto.threshold, params);
  return auto.enabled && travel === null && site.stock.lte(site.size.mul(threshold));
}

/**
 * Schritt (3) des Simulationsschritts: Bei fälligem Auslöser Aufbruch zum Ziel der Strategie mit
 * `auto: true`. Ohne Auslöser oder Ziel kommt derselbe Zustand ohne Ereignis zurück.
 */
export function applyAutoMove(state: GameState, params: BalanceParams): SiteResult {
  if (!isAutoMoveDue(state, params)) {
    return { state, events: [] };
  }
  const target = strategyTarget(state, state.auto.strategy, params);
  return target === null ? { state, events: [] } : depart(state, target, true, params);
}
