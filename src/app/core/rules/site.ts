import type { GameState } from '../state/game-state';

/** Provisorium bis M1.2: füllt die leere Futterstelle wieder auf (Game-Design §4.4). */
export function renewSite(state: GameState): GameState {
  const { site } = state;
  if (!site.stock.isZero() || site.size.isZero()) {
    return state;
  }
  return { ...state, site: { ...site, stock: site.size } };
}
