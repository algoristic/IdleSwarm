import type { BalanceParams } from '@app/balance/domain/constants';
import { collectGain, siteMsLeft } from '@app/balance/domain/formulas';
import type { Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import type { SiteResult } from './models/site-event.model';

/** Grundertrag und Sammeln im Simulationsschritt; ohne Ertrag kommt derselbe Zustand zurück. */
export function applyCollect(
  state: GameState,
  dtMs: number,
  params: BalanceParams,
  modifiers: Modifiers,
): GameState {
  const { res, site, units } = state;
  const gain = collectGain(units, site.stock, dtMs, params, modifiers);
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

/**
 * Wie {@link applyCollect}, meldet aber `siteDepleted`, wenn der Vorrat im Schritt auf 0 fällt. Der
 * Zeitpunkt liegt exakt im Schritt, weil die Abbaurate im Schritt konstant ist. `playedMs` ist die
 * Spielzeit zu Beginn des Schritts.
 */
export function collectStep(
  state: GameState,
  dtMs: number,
  playedMs: number,
  params: BalanceParams,
  modifiers: Modifiers,
): SiteResult {
  const next = applyCollect(state, dtMs, params, modifiers);
  const { site, units } = state;
  if (next === state || !next.site.stock.isZero()) {
    return { state: next, events: [] };
  }
  const msLeft = siteMsLeft(units, site.stock, params, modifiers);
  const atMs = playedMs + (msLeft === null ? dtMs : Math.min(dtMs, msLeft));
  return { state: next, events: [{ type: 'siteDepleted', playedMs: atMs, siteType: site.type }] };
}

/**
 * Sammelt genau bis zum Vorrat `stock` (≤ Vorrat), z. B. bis zu einer Abbau-Schwelle der Funde
 * (Game-Design §4.16): Nahrung `+= V − stock`, Vorrat exakt `stock`. `atMs` ist die Spielzeit, zu der
 * die konstante Abbaurate den Vorrat dorthin bringt; fällt er auf 0, meldet es dort `siteDepleted`.
 * Ohne Abbau kommt derselbe Zustand zurück.
 */
export function collectToStock(state: GameState, stock: Num, atMs: number): SiteResult {
  const { res, site } = state;
  if (!stock.lt(site.stock)) {
    return { state, events: [] };
  }
  const next: GameState = {
    ...state,
    res: { ...res, food: res.food.add(site.stock.sub(stock)) },
    site: { ...site, stock },
  };
  if (!stock.isZero()) {
    return { state: next, events: [] };
  }
  return {
    state: next,
    events: [{ type: 'siteDepleted', playedMs: atMs, siteType: site.type }],
  };
}
