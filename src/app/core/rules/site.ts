import type { BalanceParams } from '../balance/constants';
import { clickGain } from '../balance/formulas';
import { Num } from '../num/num';
import type { GameState } from '../state/game-state';

/** Überträgt den Klickertrag vom Vorrat in die Nahrung (Game-Design §4.1). */
export function clickSite(state: GameState, params: BalanceParams): GameState {
  const { site, res } = state;
  const gain = clickGain(site.stock, params);
  if (!gain.gt(Num.ZERO)) {
    return state;
  }
  // Nimmt der Klick den ganzen Rest, ist der Vorrat exakt 0, unabhängig von der Rechnung in `sub`.
  const stock = gain.gte(site.stock) ? Num.ZERO : site.stock.sub(gain);
  return {
    ...state,
    res: { ...res, food: res.food.add(gain) },
    site: { ...site, stock },
  };
}

/** Provisorium bis M1.2: füllt die leere Futterstelle wieder auf (Game-Design §4.4). */
export function renewSite(state: GameState): GameState {
  const { site } = state;
  if (!site.stock.isZero() || site.size.isZero()) {
    return state;
  }
  return { ...state, site: { ...site, stock: site.size } };
}
