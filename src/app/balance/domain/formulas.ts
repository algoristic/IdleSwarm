import { Num } from '@app/shared/util/num/num';
import { MS_PER_MINUTE, MS_PER_SECOND, SECONDS_PER_MINUTE } from '@app/shared/util/time/time-units';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { CandidateStatus, Position } from '@app/site/domain/models/map.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { UnitType, Units } from '@app/swarm/domain/models/units.model';

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

/**
 * Rechentoleranz beim Vergleich von Distanz und Reichweite: Positionen entstehen über `cos`/`sin`,
 * die nachgerechnete Distanz weicht daher um Rundungsfehler vom gezogenen `d` ab. Ohne Toleranz läge
 * ein Ersatz mit `d = R` (Game-Design §4.6, Garantie Fall 2) womöglich knapp außer Reichweite.
 */
const DISTANCE_TOLERANCE = 1e-6;

export type SiteTypeParamKeys = Readonly<
  Record<'size' | 'defense' | 'findChance' | 'weight', keyof BalanceParams>
>;

/** Parameter je Futterstellentyp (Game-Design §2.3, `siteTypes`). */
export const SITE_TYPE_PARAMS: Readonly<Record<SiteTypeId, SiteTypeParamKeys>> = {
  'algal-mat': {
    size: 'algalMatSizeFactor',
    defense: 'algalMatDefenseFactor',
    findChance: 'algalMatFindChance',
    weight: 'algalMatWeight',
  },
  vent: {
    size: 'ventSizeFactor',
    defense: 'ventDefenseFactor',
    findChance: 'ventFindChance',
    weight: 'ventWeight',
  },
  'bacterial-mat': {
    size: 'bacterialMatSizeFactor',
    defense: 'bacterialMatDefenseFactor',
    findChance: 'bacterialMatFindChance',
    weight: 'bacterialMatWeight',
  },
  'methane-seep': {
    size: 'methaneSeepSizeFactor',
    defense: 'methaneSeepDefenseFactor',
    findChance: 'methaneSeepFindChance',
    weight: 'methaneSeepWeight',
  },
  'whale-fall': {
    size: 'whaleFallSizeFactor',
    defense: 'whaleFallDefenseFactor',
    findChance: 'whaleFallFindChance',
    weight: 'whaleFallWeight',
  },
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

/** Restzeit der Futterstelle in Millisekunden; `null` wie bei {@link siteSecondsLeft}. */
export function siteMsLeft(units: Units, stock: Num, params: BalanceParams): number | null {
  const seconds = siteSecondsLeft(units, stock, params);
  return seconds === null ? null : seconds.toNumber() * MS_PER_SECOND;
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
  return soldierAttack(units.soldiers, params);
}

/** Angriff `A = S · a_s` einer Anzahl Soldaten, z. B. der mitkommenden `S'` (Game-Design §4.8). */
export function soldierAttack(soldiers: Num, params: BalanceParams): Num {
  return soldiers.mul(params.soldierAttack);
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

/** Belegung über dem Platz: Beim Aufbruch bleiben Einheiten zurück (Game-Design §4.9). */
export function isSpaceOverfull(units: Units, params: BalanceParams): boolean {
  return spaceUsed(units, params).gt(spaceAvailable(units, params));
}

/**
 * Wie viele Einheiten mit Platzbedarf `space` in `capacity` passen, höchstens `count`. Ohne
 * Platzbedarf passen alle.
 */
function fitting(count: Num, capacity: Num, space: number): Num {
  return space > 0 ? count.min(capacity.max(Num.ZERO).div(space)) : count;
}

/**
 * Mitkommende Einheiten `D'`, `S'` beim Aufbruch je Mitnahme-Priorität (Game-Design §4.9).
 * Königinnen kommen immer mit; bei `O ≤ C` kommen alle mit, und es kommt dasselbe Objekt zurück.
 */
export function carriedUnits(
  units: Units,
  priority: TransportPriority,
  params: BalanceParams,
): Units {
  const capacity = spaceAvailable(units, params).max(Num.ZERO);
  const used = spaceUsed(units, params);
  if (used.lte(capacity)) {
    return units;
  }
  const { drones, soldiers } = units;
  const { droneSpace, soldierSpace } = params;
  switch (priority) {
    case 'drones-first': {
      const carried = fitting(drones, capacity, droneSpace);
      const rest = capacity.sub(carried.mul(droneSpace));
      return { ...units, drones: carried, soldiers: fitting(soldiers, rest, soldierSpace) };
    }
    case 'soldiers-first': {
      const carried = fitting(soldiers, capacity, soldierSpace);
      const rest = capacity.sub(carried.mul(soldierSpace));
      return { ...units, drones: fitting(drones, rest, droneSpace), soldiers: carried };
    }
    case 'balanced': {
      // `O > C ≥ 0`, also ist `O` positiv.
      const share = capacity.div(used);
      return { ...units, drones: drones.mul(share), soldiers: soldiers.mul(share) };
    }
  }
}

/** Einnehmbar: `A ≥ B` (Game-Design §4.8); vor dem Aufbruch mit `A'` nach Transport. */
export function isCapturable(attack: Num, defense: Num): boolean {
  return attack.gte(defense);
}

/**
 * Erwartete Verluste `L = S · λ · (B / A)^κ · M_verlust` mit `M_verlust = 1` bis M1.3
 * (Game-Design §4.8); 0 bei `B = 0`, auch bei `A = 0`. Für nicht einnehmbare Ziele ist `B / A` auf 1
 * begrenzt, `L` also höchstens `λ · S`.
 */
export function expectedLosses(soldiers: Num, defense: Num, params: BalanceParams): Num {
  if (!defense.gt(Num.ZERO) || !soldiers.gt(Num.ZERO)) {
    return Num.ZERO;
  }
  const cap = soldiers.mul(params.lossFactor);
  const attack = soldiers.mul(params.soldierAttack);
  if (!attack.gt(Num.ZERO)) {
    return cap;
  }
  const ratio = defense.div(attack).min(Num.ONE);
  return cap.mul(ratio.pow(params.lossExponent)).min(cap);
}

/** Erwarteter Verlustanteil `L / S'` (Game-Design §4.5); 0 bei `L = 0`. */
export function expectedLossShare(losses: Num, soldiers: Num): Num {
  return losses.gt(Num.ZERO) && soldiers.gt(Num.ZERO) ? losses.div(soldiers) : Num.ZERO;
}

/**
 * Ausbeute beim Opfern `η = min(η_0 · M_ausbeute, 1 − v_min)` (Game-Design §4.10). Einzige Quelle der
 * Ausbeute: Adaptionen ab M1.3 ergänzen hier ihren Modifikator `M_ausbeute` (bis dahin 1).
 */
export function sacrificeYieldShare(params: BalanceParams): number {
  const yieldModifier = 1;
  return Math.min(params.sacrificeYield * yieldModifier, 1 - params.minSacrificeLoss);
}

/** Umwandlungsverlust `1 − η`, vor dem Opfern angezeigt (Game-Design §4.10, US-04.07). */
export function sacrificeLossShare(params: BalanceParams): number {
  return 1 - sacrificeYieldShare(params);
}

/** Nahrung aus `n` geopferten Drohnen: `n · η · c_d`, zum Basispreis (Game-Design §4.10). */
export function sacrificeFood(count: Num, params: BalanceParams): Num {
  return count.mul(sacrificeYieldShare(params) * params.droneCost);
}

/**
 * Drohnen je Königin `k_q = Preis_Königin / (η · c_d)` zum aktuellen Königinnenpreis
 * (Game-Design §4.10). Ohne positiven Drohnenwert `η · c_d` ist keine Umwandlung möglich: `null`.
 */
export function dronesPerQueen(bought: Units, params: BalanceParams): Num | null {
  const droneValue = sacrificeYieldShare(params) * params.droneCost;
  return droneValue > 0 ? unitPrice('queens', bought, params).div(droneValue) : null;
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

/** Ziehungsgewicht `g` eines Futterstellentyps (Game-Design §2.3). */
export function siteTypeWeight(type: SiteTypeId, params: BalanceParams): number {
  return params[SITE_TYPE_PARAMS[type].weight];
}

/** Fundchance eines Futterstellentyps; nur Anzeige, gezogen ab M1.3 (Game-Design §4.5). */
export function siteFindChance(type: SiteTypeId, params: BalanceParams): number {
  return params[SITE_TYPE_PARAMS[type].findChance];
}

/**
 * Gewichtete Ziehung (Game-Design §4.6): erster Index, bei dem die aufsummierten Gewichte `r · Σg`
 * übersteigen. Ohne positives Gewicht fällt die Wahl auf den ersten Index.
 */
export function weightedIndex(random: number, weights: readonly number[]): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const limit = random * total;
  let cumulative = 0;
  let lastPositive = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (weights[i] > 0) {
      lastPositive = i;
    }
    if (cumulative > limit) {
      return i;
    }
  }
  // Nur bei Rundung von `Σg` oder ohne positives Gewicht erreicht.
  return lastPositive;
}

/** Zufallsfaktor `u = 1 − σ + 2σ · r` (Game-Design §4.6). */
export function spreadFactor(random: number, params: BalanceParams): number {
  return 1 - params.siteSpread + 2 * params.siteSpread * random;
}

/** Distanz eines Kandidaten `d = d_min + (d_max − d_min) · r` (Game-Design §4.6). */
export function candidateDistance(random: number, params: BalanceParams): number {
  const { candidateMinDistance: min, candidateMaxDistance: max } = params;
  return min + (max - min) * random;
}

/** Größe `G = s_0 · γ_G^(z+1) · f_G · (1 + β_G · (d − 1)) · u_G`, ungerundet (Game-Design §4.6). */
export function candidateSize(
  type: SiteTypeId,
  distance: number,
  moves: number,
  spread: number,
  params: BalanceParams,
): Num {
  const factor = params[SITE_TYPE_PARAMS[type].size];
  const distanceBonus = 1 + params.siteSizeDistanceBonus * (distance - 1);
  return Num.from(params.siteSizeGrowth)
    .pow(moves + 1)
    .mul(params.siteSize)
    .mul(factor * distanceBonus * spread);
}

/**
 * Abwehr `B = round(b_0 · γ_B^z · f_B · (1 + β_B · (d − 1)) · u_B)`, kaufmännisch gerundet
 * (Game-Design §4.6).
 */
export function candidateDefense(
  type: SiteTypeId,
  distance: number,
  moves: number,
  spread: number,
  params: BalanceParams,
): Num {
  const factor = params[SITE_TYPE_PARAMS[type].defense];
  const distanceBonus = 1 + params.siteDefenseDistanceBonus * (distance - 1);
  return Num.from(params.siteDefenseGrowth)
    .pow(moves)
    .mul(params.siteDefenseBase)
    .mul(factor * distanceBonus * spread)
    .round();
}

/** DNA-Belohnung `d_0 · B^δ`; 0 bei `B = 0` (Game-Design §4.5). */
export function dnaReward(defense: Num, params: BalanceParams): Num {
  if (!defense.gt(Num.ZERO)) {
    return Num.ZERO;
  }
  return defense.pow(params.dnaExponent).mul(params.dnaBase);
}

/** Euklidische Distanz in der Ebene (Game-Design §4.7). */
export function distanceBetween(from: Position, to: Position): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

/** Punkt in Distanz `d` und Winkel `φ` von `origin` (Game-Design §4.6). */
export function positionAt(origin: Position, distance: number, angle: number): Position {
  return { x: origin.x + distance * Math.cos(angle), y: origin.y + distance * Math.sin(angle) };
}

/**
 * Aktuelle Reichweite `R = R_0` (Game-Design §4.5). Einzige Quelle der Reichweite: Adaptionen ab
 * M1.3 ergänzen hier ihren Modifikator.
 */
export function swarmRange(params: BalanceParams): number {
  return params.baseRange;
}

/** `d ≤ R` mit Rechentoleranz (Game-Design §4.6, §4.7). */
export function isWithinRange(distance: number, range: number): boolean {
  return distance <= range + DISTANCE_TOLERANCE;
}

/** Status aus Distanz und Reichweite (Game-Design §4.7). */
export function candidateStatus(
  distance: number,
  range: number,
  params: BalanceParams,
): CandidateStatus {
  if (isWithinRange(distance, range)) {
    return 'in-range';
  }
  return isWithinRange(distance, range + params.perceptionMargin) ? 'out-of-range' : 'unexplored';
}

/** Reisedauer `d · t_r` in Millisekunden (Game-Design §4.5, §4.11). */
export function travelDurationMs(distance: number, params: BalanceParams): number {
  return distance * params.travelSecondsPerDistance * MS_PER_SECOND;
}

/** Schwelle des Auto-Weiterziehens, begrenzt auf `[0; θ_max]` (Game-Design §4.12). */
export function clampAutoThreshold(threshold: number, params: BalanceParams): number {
  return Math.min(Math.max(threshold, 0), params.maxAutoThreshold);
}
