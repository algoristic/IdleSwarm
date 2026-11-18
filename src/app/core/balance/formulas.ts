import { Num } from '../num/num';
import type { BalanceParams } from './constants';

/** Ertrag eines Klicks: `min(k_0 · M_klick, V)` mit `M_klick = 1` bis M1.3 (Game-Design §4.1). */
export function clickGain(stock: Num, params: BalanceParams): Num {
  return Num.from(params.clickYield).min(stock);
}
