import type { BalanceParams } from '../balance/constants';
import { collectGain } from '../balance/formulas';
import { Num } from '../num/num';
import type { GameState } from '../state/game-state';

/** Grundertrag und Sammeln im Simulationsschritt; ohne Ertrag kommt derselbe Zustand zurück. */
export function applyCollect(state: GameState, dtMs: number, params: BalanceParams): GameState {
  const { res, site, units } = state;
  const gain = collectGain(units, site.stock, dtMs, params);
  if (!gain.gt(Num.ZERO)) {
    return state;
  }
  // Nimmt der Schritt den ganzen Rest, ist der Vorrat exakt 0, unabhängig von der Rechnung in `sub`.
  const stock = gain.gte(site.stock) ? Num.ZERO : site.stock.sub(gain);
  // Geht die Menge im Vorrat unter der Rechengenauigkeit unter, entsteht auch keine Nahrung.
  if (stock.eq(site.stock)) {
    return state;
  }
  return {
    ...state,
    res: { ...res, food: res.food.add(gain) },
    site: { ...site, stock },
  };
}
