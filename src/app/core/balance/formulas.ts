import type { UnitType } from '../data/units';
import { Num } from '../num/num';
import type { Units } from '../state/game-state';
import type { BalanceParams } from './constants';

/** Ab diesem Anteil des verfügbaren Platzes wird gewarnt (Game-Design §4.5, US-02.04). */
const SPACE_WARNING_SHARE = 0.9;

/** Parameter der Kostenkurve je Einheitentyp (Game-Design §2.3). */
const COST_CURVES: Readonly<
  Record<UnitType, { readonly cost: keyof BalanceParams; readonly growth: keyof BalanceParams }>
> = {
  queens: { cost: 'queenCost', growth: 'queenCostGrowth' },
  drones: { cost: 'droneCost', growth: 'droneCostGrowth' },
  soldiers: { cost: 'soldierCost', growth: 'soldierCostGrowth' },
};

/** Effekt einer weiteren Königin. */
export interface QueenEffect {
  readonly eggsPerMin: Num;
  readonly space: Num;
}

/** Ertrag eines Klicks: `min(k_0 · M_klick, V)` mit `M_klick = 1` bis M1.3 (Game-Design §4.1). */
export function clickGain(stock: Num, params: BalanceParams): Num {
  return Num.from(params.clickYield).min(stock);
}

/** Ungerundeter Kaufpreis `c · w^n` mit `n` aus dem Kaufzähler (Game-Design §3). */
export function unitPrice(type: UnitType, bought: Units, params: BalanceParams): Num {
  const { cost, growth } = COST_CURVES[type];
  return Num.from(params[growth]).pow(bought[type]).mul(params[cost]);
}

/** Eier/min: `Q · e_q · M_brut` mit `M_brut = 1` bis M1.3 (Game-Design §4.5). */
export function eggsPerMinute(units: Units, params: BalanceParams): Num {
  return units.queens.mul(params.queenEggsPerMin);
}

/** Gesamtangriff: `S · a_s` (Game-Design §4.5). */
export function totalAttack(units: Units, params: BalanceParams): Num {
  return units.soldiers.mul(params.soldierAttack);
}

/** Verfügbarer Platz: `Q · p_q` (Game-Design §4.5). */
export function spaceAvailable(units: Units, params: BalanceParams): Num {
  return units.queens.mul(params.queenSpace);
}

/** Belegter Platz: `D · p_d + S · p_s`; darf den verfügbaren übersteigen (Game-Design §4.5). */
export function spaceUsed(units: Units, params: BalanceParams): Num {
  return units.drones.mul(params.droneSpace).add(units.soldiers.mul(params.soldierSpace));
}

/** Auslastung als Anteil (1 = 100 %); ohne verfügbaren Platz gibt es keinen Wert. */
export function spaceUsage(units: Units, params: BalanceParams): Num | null {
  const available = spaceAvailable(units, params);
  return available.isZero() ? null : spaceUsed(units, params).div(available);
}

/** Warnschwelle: `belegt ≥ 0,9 · verfügbar`, also auch immer bei 0 verfügbarem Platz. */
export function isSpaceWarning(units: Units, params: BalanceParams): boolean {
  return spaceUsed(units, params).gte(spaceAvailable(units, params).mul(SPACE_WARNING_SHARE));
}

/** Effekt einer weiteren Königin: `+e_q · M_brut` Eier/min, `+p_q` Platz (Game-Design §4.5). */
export function nextQueenEffect(params: BalanceParams): QueenEffect {
  return { eggsPerMin: Num.from(params.queenEggsPerMin), space: Num.from(params.queenSpace) };
}
