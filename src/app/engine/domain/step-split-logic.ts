import { BalanceParams } from '@app/balance/domain/constants';
import { siteMsLeft } from '@app/balance/domain/formulas';

import { GameState } from './models/game-state.model';

/**
 * Nächster Zeitpunkt, an dem ein Schritt geteilt wird: die Ankunft oder der vorhergesagte Auslöser
 * des Auto-Weiterziehens (`V = θ · G`), auf die nächste ganze Millisekunde aufgerundet, mindestens
 * eine Millisekunde nach `timeMs`. Im Schritt ist die Abbaurate konstant, die Vorhersage also
 * exakt; so bricht der Schwarm nicht erst am Ende eines großen Schritts auf. `Infinity`, wenn es
 * nichts zu teilen gibt. Genutzt vom Headless-Runner, später vom Offline-Catch-up.
 */
export function nextSplitMs(state: GameState, timeMs: number, params: BalanceParams): number {
  const { auto, site, travel, units } = state;
  if (travel !== null) {
    return timeMs + Math.max(1, Math.ceil(travel.remainingMs));
  }
  if (!auto.enabled) {
    return Infinity;
  }
  const msLeft = siteMsLeft(units, site.stock.sub(site.size.mul(auto.threshold)), params);
  // Ist der Auslöser schon erreicht, fand die Strategie kein Ziel; dann gibt es nichts zu teilen.
  return msLeft !== null && msLeft > 0 ? timeMs + Math.ceil(msLeft) : Infinity;
}
