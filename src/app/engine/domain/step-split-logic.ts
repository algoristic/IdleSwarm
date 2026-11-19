import { BalanceParams } from '@app/balance/domain/constants';
import { clampAutoThreshold, siteMsLeft } from '@app/balance/domain/formulas';
import { nextBuffExpiryMs, nextHarvestThreshold } from '@app/finds/domain/finds-logic';

import { GameState } from './models/game-state.model';
import { stateModifiers } from './modifiers-logic';

/** Teilungspunkt `ms` nach `timeMs`, aufgerundet auf ganze Millisekunden, mindestens 1 ms später. */
function splitAfter(timeMs: number, ms: number): number {
  return timeMs + Math.max(1, Math.ceil(ms));
}

/**
 * Nächster Zeitpunkt, an dem ein Schritt geteilt wird: die Ankunft, die nächste Abbau-Schwelle der
 * Funde, der nächste Ablauf eines Buffs (Game-Design §4.16) oder der vorhergesagte Auslöser des
 * Auto-Weiterziehens (`V = θ · G`), auf die nächste ganze Millisekunde aufgerundet, mindestens eine
 * Millisekunde nach `timeMs`. Im Schritt ist die Abbaurate konstant, die Vorhersage also exakt; so
 * bricht der Schwarm nicht erst am Ende eines großen Schritts auf. `step` teilt an Ankunft, Schwellen
 * und Abläufen selbst exakt; die Teilung hier hält Bot-Entscheidungen und Auto-Weiterziehen an
 * denselben Punkten. `Infinity`, wenn es nichts zu teilen gibt. Die Schwelle wirkt wie in
 * `isAutoMoveDue` höchstens mit `θ_max`. Genutzt vom Headless-Runner, später vom Offline-Catch-up.
 */
export function nextSplitMs(state: GameState, timeMs: number, params: BalanceParams): number {
  const { auto, finds, site, time, travel, units } = state;
  const expiryMs = nextBuffExpiryMs(finds, time.played);
  const expirySplit = expiryMs === null ? Infinity : splitAfter(timeMs, expiryMs - time.played);
  if (travel !== null) {
    return Math.min(splitAfter(timeMs, travel.remainingMs), expirySplit);
  }
  const modifiers = stateModifiers(state, params);
  const harvest = nextHarvestThreshold(state, params, modifiers);
  const harvestSplit = harvest === null ? Infinity : splitAfter(timeMs, harvest.msLeft);
  if (!auto.enabled) {
    return Math.min(harvestSplit, expirySplit);
  }
  const threshold = clampAutoThreshold(auto.threshold, params);
  const stockAbove = site.stock.sub(site.size.mul(threshold));
  const msLeft = siteMsLeft(units, stockAbove, params, modifiers);
  // Ist der Auslöser schon erreicht, fand die Strategie kein Ziel; dann gibt es nichts zu teilen.
  const autoSplit = msLeft !== null && msLeft > 0 ? timeMs + Math.ceil(msLeft) : Infinity;
  return Math.min(autoSplit, harvestSplit, expirySplit);
}
