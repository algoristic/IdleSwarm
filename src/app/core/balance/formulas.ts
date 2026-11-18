import type { UnitType } from '../data/units';
import { Num } from '../num/num';
import type { Units } from '../state/game-state';
import type { BalanceParams } from './constants';

/** Ab diesem Anteil des verfügbaren Platzes wird gewarnt (Game-Design §4.5, US-02.04). */
const SPACE_WARNING_SHARE = 0.9;

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60_000;
const SECONDS_PER_MINUTE = 60;

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

/** Ergebnis der Brut eines Schritts (Game-Design §4.3). */
export interface BroodResult {
  readonly hatched: Num;
  readonly drones: Num;
  readonly soldiers: Num;
  readonly foodCost: Num;
}

/** Ungerundeter Kaufpreis `c · w^n` mit `n` aus dem Kaufzähler (Game-Design §3). */
export function unitPrice(type: UnitType, bought: Units, params: BalanceParams): Num {
  const { cost, growth } = COST_CURVES[type];
  return Num.from(params[growth]).pow(bought[type]).mul(params[cost]);
}

/** Nahrung/s der Drohnen: `D · r_d · M_sammeln` mit `M_sammeln = 1` bis M1.3, ohne Vorratsgrenze. */
function droneCollectRate(units: Units, params: BalanceParams): Num {
  return units.drones.mul(params.droneCollectRate);
}

/** Abbaurate der Futterstelle: `g_0 + D · r_d · M_sammeln`, ohne Vorratsgrenze (Game-Design §4.3). */
function siteYieldRate(units: Units, params: BalanceParams): Num {
  return droneCollectRate(units, params).add(params.baseFoodRate);
}

/** Angezeigter Grundertrag in Nahrung/s; bei leerem Vorrat 0 (Game-Design §4.1). */
export function baseFoodPerSecond(stock: Num, params: BalanceParams): Num {
  return stock.isZero() ? Num.ZERO : Num.from(params.baseFoodRate);
}

/** Angezeigte Nahrung/s der Drohnen; bei leerem Vorrat 0 (Game-Design §4.5). */
export function droneFoodPerSecond(units: Units, stock: Num, params: BalanceParams): Num {
  return stock.isZero() ? Num.ZERO : droneCollectRate(units, params);
}

/** Nahrung/s gesamt: `g_0 + D · r_d · M_sammeln`; bei leerem Vorrat 0 (Game-Design §4.5). */
export function foodPerSecond(units: Units, stock: Num, params: BalanceParams): Num {
  return stock.isZero() ? Num.ZERO : siteYieldRate(units, params);
}

/**
 * Ertrag eines Schritts aus Grundertrag und Sammeln: `F = min((g_0 + D · r_d · M_sammeln) · dt, V)`
 * (Game-Design §4.3).
 */
export function collectGain(units: Units, stock: Num, dtMs: number, params: BalanceParams): Num {
  if (stock.isZero()) {
    return Num.ZERO;
  }
  const gain = siteYieldRate(units, params).mul(dtMs / MS_PER_SECOND);
  return gain.gt(Num.ZERO) ? gain.min(stock) : Num.ZERO;
}

/**
 * Restzeit der Futterstelle in Sekunden: `V / (g_0 + D · r_d · M_sammeln)` (Game-Design §4.5).
 * Ohne Abbaurate gibt es keine Schätzung, auch nicht bei leerem Vorrat.
 */
export function siteSecondsLeft(units: Units, stock: Num, params: BalanceParams): Num | null {
  const rate = siteYieldRate(units, params);
  return rate.gt(Num.ZERO) ? stock.div(rate) : null;
}

/** Eier/min: `Q · e_q · M_brut` mit `M_brut = 1` bis M1.3 (Game-Design §4.5). */
export function eggsPerMinute(units: Units, params: BalanceParams): Num {
  return units.queens.mul(params.queenEggsPerMin);
}

/** Mittlere Brutkosten: `c̄ = a · c_d + (1 − a) · c_s`, ohne Preisfaktor (Game-Design §4.3). */
export function meanBroodCost(params: BalanceParams): number {
  const { broodDroneShare: share, droneCost, soldierCost } = params;
  return share * droneCost + (1 - share) * soldierCost;
}

/**
 * Brut eines Schritts: `e = E / 60 · dt`, `h = min(e, N / c̄)` (Game-Design §4.3).
 * Bei `c̄ = 0` begrenzt die Nahrung nichts.
 */
export function broodResult(
  units: Units,
  food: Num,
  dtMs: number,
  params: BalanceParams,
): BroodResult {
  const eggs = eggsPerMinute(units, params).mul(dtMs / MS_PER_MINUTE);
  const meanCost = meanBroodCost(params);
  const fullCost = eggs.mul(meanCost);
  // Begrenzt die Nahrung, zählt sie direkt als Kosten: `h · c̄` könnte gerundet von `N` abweichen.
  const limited = meanCost > 0 && fullCost.gte(food);
  const hatched = limited ? food.div(meanCost) : eggs;
  const share = params.broodDroneShare;
  return {
    hatched,
    drones: hatched.mul(share),
    soldiers: hatched.mul(1 - share),
    foodCost: limited ? food : fullCost,
  };
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

/** Nahrungsbedarf der Brut bei voller Eierrate: `E / 60 · c̄` (Game-Design §4.3). */
export function broodFoodPerSecond(units: Units, params: BalanceParams): Num {
  return eggsPerMinute(units, params).mul(meanBroodCost(params)).div(SECONDS_PER_MINUTE);
}

/**
 * Nettozufluss: Nahrung/s gesamt minus Nahrungsbedarf der Brut. Kann negativ sein; die Brut pausiert
 * dann real anteilig (Game-Design §4.3), die Nahrung fällt also nicht unter 0.
 */
export function netFoodPerSecond(units: Units, stock: Num, params: BalanceParams): Num {
  return foodPerSecond(units, stock, params).sub(broodFoodPerSecond(units, params));
}

/** Kaufbedingung `N ≥ Preis` (Game-Design §4.2); ein negativer Preis ist nie bezahlbar. */
export function isAffordable(price: Num, food: Num): boolean {
  return !price.isNegative() && food.gte(price);
}

/**
 * Sekunden, bis `price` beim Zufluss `foodPerSecond` bezahlbar ist: 0, wenn er es schon ist, `null`,
 * wenn er so nie erreicht wird. Schätzung mit konstantem Zufluss.
 */
export function secondsUntilAffordable(price: Num, food: Num, foodPerSecond: Num): Num | null {
  if (isAffordable(price, food)) {
    return Num.ZERO;
  }
  if (price.isNegative() || !foodPerSecond.gt(Num.ZERO)) {
    return null;
  }
  return price.sub(food).div(foodPerSecond);
}
