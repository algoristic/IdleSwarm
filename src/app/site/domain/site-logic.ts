import type { GameState } from '@app/engine/domain/models/game-state.model';

/**
 * Provisorium bis M1.2: füllt die leere Futterstelle wieder auf (Game-Design §4.4). Während einer
 * Reise ohne Wirkung, weil die verlassene Futterstelle nicht mehr nutzbar ist.
 */
export function renewSite(state: GameState): GameState {
  const { site } = state;
  if (state.travel !== null || !site.stock.isZero() || site.size.isZero()) {
    return state;
  }
  return { ...state, site: { ...site, stock: site.size } };
}
