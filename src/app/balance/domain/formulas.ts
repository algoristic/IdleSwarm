import type {
  BuffId,
  CollectionSetId,
  FindEntryId,
  NUTRIENT_BUBBLE,
  FOREIGN_DNA,
} from '@app/finds/domain/models/finds.model';
import type {
  GenomeNodeId,
  GenomeTier,
  UniqueAdaptationId,
} from '@app/genome/domain/models/genome.model';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_MINUTE, MS_PER_SECOND, SECONDS_PER_MINUTE } from '@app/shared/util/time/time-units';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { CandidateStatus, Position } from '@app/site/domain/models/map.model';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';
import type { UnitType, Units } from '@app/swarm/domain/models/units.model';

import type { BalanceParams } from './constants';
import { effectValue, modifierFactor, NEUTRAL_MODIFIERS } from './effects-logic';
import type { Modifiers } from './models/effect.model';

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

export type GenomeNodeParamKeys = Readonly<Record<'effect', keyof BalanceParams>>;

/**
 * Parameter je regulärer Adaption (Game-Design §2.3, Parameter je ID): `effect` ist der Betrag bzw.
 * Faktor ihres Effekts mit Zahl.
 */
export const GENOME_NODE_PARAMS: Readonly<Record<GenomeNodeId, GenomeNodeParamKeys>> = {
  'cilia-1': { effect: 'cilia1Effect' },
  'cilia-2': { effect: 'cilia2Effect' },
  'filter-feeder': { effect: 'filterFeederEffect' },
  chemotaxis: { effect: 'chemotaxisEffect' },
  flagellum: { effect: 'flagellumEffect' },
  'yolk-reserve': { effect: 'yolkReserveEffect' },
  'brood-combs': { effect: 'broodCombsEffect' },
  'second-gland': { effect: 'secondGlandEffect' },
  'nurse-cells': { effect: 'nurseCellsEffect' },
  budding: { effect: 'buddingEffect' },
  'acid-vacuole': { effect: 'acidVacuoleEffect' },
  autophagy: { effect: 'autophagyEffect' },
  'nettle-cells': { effect: 'nettleCellsEffect' },
  'chalk-shell': { effect: 'chalkShellEffect' },
  'spine-cells': { effect: 'spineCellsEffect' },
};

export type UniqueAdaptationParamKeys = Readonly<
  Record<'effect' | 'fragments', keyof BalanceParams>
>;

/**
 * Parameter je einzigartiger Adaption (Game-Design §2.3, Parameter je ID): Effektwert und Zahl der
 * benötigten Fragmente.
 */
export const UNIQUE_ADAPTATION_PARAMS: Readonly<
  Record<UniqueAdaptationId, UniqueAdaptationParamKeys>
> = {
  thermosynthesis: { effect: 'thermosynthesisEffect', fragments: 'thermosynthesisFragments' },
  'algal-symbiosis': { effect: 'algalSymbiosisEffect', fragments: 'algalSymbiosisFragments' },
  'crystal-sense': { effect: 'crystalSenseEffect', fragments: 'crystalSenseFragments' },
  'sulfur-shell': { effect: 'sulfurShellEffect', fragments: 'sulfurShellFragments' },
};

type ParamKey = keyof BalanceParams;

/** Schlüssel je Eintrag der Fundtabelle: das Gewicht, dazu je Fundart die Menge bzw. der Buff. */
export type FindEntryParamKeys<Id extends FindEntryId = FindEntryId> = Id extends typeof FOREIGN_DNA
  ? Readonly<Record<'weight' | 'dnaFactor', ParamKey>>
  : Id extends typeof NUTRIENT_BUBBLE
    ? Readonly<Record<'weight' | 'foodShare', ParamKey>>
    : Id extends BuffId
      ? Readonly<Record<'weight' | 'factor' | 'seconds', ParamKey>>
      : Readonly<Record<'weight', ParamKey>>;

/**
 * Parameter je Eintrag der Fundtabelle (Game-Design §2.3, Parameter je ID, §4.16): Gewicht
 * `<id>Weight`; für Fremde DNA `φ_D`, für die Nährstoffblase `φ_N`, für Buffs `μ_B` und `T_B`.
 */
export const FIND_ENTRY_PARAMS: { readonly [Id in FindEntryId]: FindEntryParamKeys<Id> } = {
  'foreign-dna': { weight: 'foreignDnaWeight', dnaFactor: 'foreignDnaFactor' },
  'nutrient-bubble': { weight: 'nutrientBubbleWeight', foodShare: 'nutrientBubbleShare' },
  'plankton-bloom': {
    weight: 'planktonBloomWeight',
    factor: 'planktonBloomFactor',
    seconds: 'planktonBloomSeconds',
  },
  'warm-current': {
    weight: 'warmCurrentWeight',
    factor: 'warmCurrentFactor',
    seconds: 'warmCurrentSeconds',
  },
  thermophile: { weight: 'thermophileWeight' },
  'sulfur-pearl': { weight: 'sulfurPearlWeight' },
  chloroplast: { weight: 'chloroplastWeight' },
  'primal-crystal': { weight: 'primalCrystalWeight' },
  stromatolite: { weight: 'stromatoliteWeight' },
  'biofilm-disc': { weight: 'biofilmDiscWeight' },
  'green-pearl': { weight: 'greenPearlWeight' },
  pyrite: { weight: 'pyriteWeight' },
  'basalt-pebble': { weight: 'basaltPebbleWeight' },
  magnetite: { weight: 'magnetiteWeight' },
  'bone-splinter': { weight: 'boneSplinterWeight' },
  'fat-pearl': { weight: 'fatPearlWeight' },
  'tooth-scale': { weight: 'toothScaleWeight' },
  pumice: { weight: 'pumiceWeight' },
  'foam-ball': { weight: 'foamBallWeight' },
  'clay-bead': { weight: 'clayBeadWeight' },
};

export type BadgeParamKeys = Readonly<Record<'effect', ParamKey>>;

/** Parameter je Badge (Game-Design §2.3, Parameter je ID, §4.17): Bonus `<setId>BadgeEffect`. */
export const BADGE_PARAMS: Readonly<Record<CollectionSetId, BadgeParamKeys>> = {
  'mat-relics': { effect: 'matRelicsBadgeEffect' },
  'deep-stones': { effect: 'deepStonesBadgeEffect' },
  'whale-relics': { effect: 'whaleRelicsBadgeEffect' },
  drift: { effect: 'driftBadgeEffect' },
};

/**
 * DNA-Kosten eines Genom-Knotens der Stufe `s`: `round(c_G · w_G^(s−1))`, kaufmännisch gerundet
 * (Game-Design §4.14); v1 8, 25, 80, 253, 800.
 */
export function genomeNodeCost(tier: GenomeTier, params: BalanceParams): Num {
  return Num.from(Math.round(params.genomeCost * params.genomeCostGrowth ** (tier - 1)));
}

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

/** Nahrung/s je Drohne: `r_d · M_sammeln` (Game-Design §4.3, §4.13). */
export function collectRatePerDrone(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return params.droneCollectRate * modifierFactor(modifiers.collectRate);
}

/** Nahrung/s der Drohnen: `D · r_d · M_sammeln`, ohne Vorratsgrenze. */
function droneCollectRate(units: Units, params: BalanceParams, modifiers: Modifiers): Num {
  return units.drones.mul(collectRatePerDrone(params, modifiers));
}

/** Abbaurate der Futterstelle: `g_0 + D · r_d · M_sammeln`, ohne Vorratsgrenze (Game-Design §4.3). */
function siteYieldRate(units: Units, params: BalanceParams, modifiers: Modifiers): Num {
  return droneCollectRate(units, params, modifiers).add(params.baseFoodRate);
}

/** Angezeigter Grundertrag in Nahrung/s; bei leerem Vorrat 0 (Game-Design §4.1). */
export function baseFoodPerSecond(stock: Num, params: BalanceParams): Num {
  return stock.isZero() ? Num.ZERO : Num.from(params.baseFoodRate);
}

/** Angezeigte Nahrung/s der Drohnen; bei leerem Vorrat 0 (Game-Design §4.5). */
export function droneFoodPerSecond(
  units: Units,
  stock: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return stock.isZero() ? Num.ZERO : droneCollectRate(units, params, modifiers);
}

/** Nahrung/s gesamt: `g_0 + D · r_d · M_sammeln`; bei leerem Vorrat 0 (Game-Design §4.5). */
export function foodPerSecond(
  units: Units,
  stock: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return stock.isZero() ? Num.ZERO : siteYieldRate(units, params, modifiers);
}

/**
 * Ertrag eines Schritts aus Grundertrag und Sammeln: `F = min((g_0 + D · r_d · M_sammeln) · dt, V)`
 * (Game-Design §4.3).
 */
export function collectGain(
  units: Units,
  stock: Num,
  dtMs: number,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  if (stock.isZero()) {
    return Num.ZERO;
  }
  const gain = siteYieldRate(units, params, modifiers).mul(dtMs / MS_PER_SECOND);
  return gain.gt(Num.ZERO) ? gain.min(stock) : Num.ZERO;
}

/**
 * Restzeit der Futterstelle in Sekunden: `V / (g_0 + D · r_d · M_sammeln)` (Game-Design §4.5).
 * Ohne Abbaurate gibt es keine Schätzung, auch nicht bei leerem Vorrat.
 */
export function siteSecondsLeft(
  units: Units,
  stock: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num | null {
  const rate = siteYieldRate(units, params, modifiers);
  return rate.gt(Num.ZERO) ? stock.div(rate) : null;
}

/** Restzeit der Futterstelle in Millisekunden; `null` wie bei {@link siteSecondsLeft}. */
export function siteMsLeft(
  units: Units,
  stock: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number | null {
  const seconds = siteSecondsLeft(units, stock, params, modifiers);
  return seconds === null ? null : seconds.toNumber() * MS_PER_SECOND;
}

/** Startpunkte `P_0 = P_d0 + P_s0`, Bezugsgröße der Brutrate (Game-Design §2.3, §4.15). */
export function basePheromonePoints(params: BalanceParams): number {
  return params.startPheromoneDrones + params.startPheromoneSoldiers;
}

/** Gesamtpunkte `P_ges = P_0 + k + P_bonus` (Game-Design §4.15). */
export function totalPheromonePoints(
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return basePheromonePoints(params) + pheromones.glands + pheromoneBonus(modifiers);
}

/** Verteilte Punkte `P_v = P_d + P_s` (Game-Design §4.15). */
export function distributedPheromonePoints(pheromones: Pheromones): number {
  return pheromones.drones + pheromones.soldiers;
}

/**
 * Freie Punkte `P_frei = P_ges − P_v` (Game-Design §4.15). Nie negativ: Ein geladener Stand mit
 * `P_v > P_ges` hat keine freien Punkte.
 */
export function freePheromonePoints(
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return Math.max(
    0,
    totalPheromonePoints(pheromones, params, modifiers) - distributedPheromonePoints(pheromones),
  );
}

/**
 * Brutfaktor `f = min(P_v, P_ges) / P_0` (Game-Design §4.15). Wirksam sind höchstens `P_ges` Punkte,
 * auch wenn ein geladener Stand mehr verteilt hat. Ohne Startpunkte (`P_0 = 0` über `params`) gibt es
 * keinen Bezug; die Brut ruht dann.
 */
export function pheromoneBroodFactor(
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  const base = basePheromonePoints(params);
  if (base <= 0) {
    return 0;
  }
  const effective = Math.min(
    distributedPheromonePoints(pheromones),
    totalPheromonePoints(pheromones, params, modifiers),
  );
  return Math.max(0, effective) / base;
}

/**
 * Drohnenanteil der Brut `a = P_d / P_v` (Game-Design §4.15). Bei `P_v = 0` ruht die Brut und `a`
 * wird nicht gebraucht; dann 0, damit `c̄` endlich bleibt.
 */
export function pheromoneDroneShare(pheromones: Pheromones): number {
  const distributed = distributedPheromonePoints(pheromones);
  return distributed > 0 ? pheromones.drones / distributed : 0;
}

/** Preis des nächsten Drüsenpunkts `c_P · w_P^k` in Nahrung, ungerundet (Game-Design §4.15). */
export function glandPrice(pheromones: Pheromones, params: BalanceParams): Num {
  return Num.from(params.glandCostGrowth).pow(pheromones.glands).mul(params.glandCost);
}

/** Eier/min je Königin: `e_q · f(P_v) · M_brut` (Game-Design §4.5, §4.13, §4.15). */
export function queenEggsPerMinute(
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return (
    params.queenEggsPerMin *
    pheromoneBroodFactor(pheromones, params, modifiers) *
    modifierFactor(modifiers.broodRate)
  );
}

/** Eier/min: `E = Q · e_q · f(P_v) · M_brut` (Game-Design §4.5, §4.15). */
export function eggsPerMinute(
  units: Units,
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return units.queens.mul(queenEggsPerMinute(pheromones, params, modifiers));
}

/**
 * Zuwachs an Eiern/min je weiterem verteilten Punkt: `Q · e_q · M_brut / P_0` (Game-Design §4.15,
 * US-03.03: „sobald verteilt“). Gilt, solange der Punkt frei ist; ohne Startpunkte 0.
 */
export function eggsPerPheromonePoint(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  const base = basePheromonePoints(params);
  if (base <= 0) {
    return Num.ZERO;
  }
  return units.queens.mul((params.queenEggsPerMin * modifierFactor(modifiers.broodRate)) / base);
}

/**
 * Mittlere Brutkosten: `c̄ = a · c_d + (1 − a) · c_s` mit `a` aus den Pheromonen, ohne Preisfaktor
 * (Game-Design §4.3, §4.15).
 */
export function meanBroodCost(pheromones: Pheromones, params: BalanceParams): number {
  const share = pheromoneDroneShare(pheromones);
  return share * params.droneCost + (1 - share) * params.soldierCost;
}

/**
 * Brut eines Schritts: `e = E / 60 · dt`, `h = min(e, N / c̄)` (Game-Design §4.3, §4.15).
 * Bei `c̄ = 0` begrenzt die Nahrung nichts.
 */
export function broodResult(
  units: Units,
  pheromones: Pheromones,
  food: Num,
  dtMs: number,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): BroodResult {
  const eggs = eggsPerMinute(units, pheromones, params, modifiers).mul(dtMs / MS_PER_MINUTE);
  const meanCost = meanBroodCost(pheromones, params);
  const fullCost = eggs.mul(meanCost);
  // Begrenzt die Nahrung, zählt sie direkt als Kosten: `h · c̄` könnte gerundet von `N` abweichen.
  const limited = meanCost > 0 && fullCost.gte(food);
  const hatched = limited ? food.div(meanCost) : eggs;
  const share = pheromoneDroneShare(pheromones);
  return {
    hatched,
    drones: hatched.mul(share),
    soldiers: hatched.mul(1 - share),
    foodCost: limited ? food : fullCost,
  };
}

/** Angriff je Soldat `a_s* = max(0, (a_s + Σ add) · Π mul)` (Game-Design §4.13). */
export function attackPerSoldier(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return effectValue(params.soldierAttack, modifiers.attackPerSoldier);
}

/** Gesamtangriff: `S · a_s*` (Game-Design §4.5, §4.13). */
export function totalAttack(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return soldierAttack(units.soldiers, params, modifiers);
}

/** Angriff `A = S · a_s*` einer Anzahl Soldaten, z. B. der mitkommenden `S'` (Game-Design §4.8). */
export function soldierAttack(
  soldiers: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return soldiers.mul(attackPerSoldier(params, modifiers));
}

/** Platz je Königin `p_q* = max(0, (p_q + Σ add) · Π mul)` (Game-Design §4.13). */
export function spacePerQueen(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return effectValue(params.queenSpace, modifiers.spacePerQueen);
}

/** Verfügbarer Platz: `C = Q · p_q*` (Game-Design §4.5, §4.13). */
export function spaceAvailable(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return units.queens.mul(spacePerQueen(params, modifiers));
}

/** Belegter Platz: `D · p_d + S · p_s`; darf den verfügbaren übersteigen (Game-Design §4.5). */
export function spaceUsed(units: Units, params: BalanceParams): Num {
  return units.drones.mul(params.droneSpace).add(units.soldiers.mul(params.soldierSpace));
}

/** Auslastung als Anteil (1 = 100 %); ohne verfügbaren Platz gibt es keinen Wert. */
export function spaceUsage(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num | null {
  const available = spaceAvailable(units, params, modifiers);
  return available.isZero() ? null : spaceUsed(units, params).div(available);
}

/** Warnschwelle: `belegt ≥ 0,9 · verfügbar`, also auch immer bei 0 verfügbarem Platz. */
export function isSpaceWarning(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): boolean {
  return spaceUsed(units, params).gte(
    spaceAvailable(units, params, modifiers).mul(SPACE_WARNING_SHARE),
  );
}

/** Belegung über dem Platz: Beim Aufbruch bleiben Einheiten zurück (Game-Design §4.9). */
export function isSpaceOverfull(
  units: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): boolean {
  return spaceUsed(units, params).gt(spaceAvailable(units, params, modifiers));
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
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Units {
  const capacity = spaceAvailable(units, params, modifiers).max(Num.ZERO);
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
 * Erwartete Verluste `L = S · λ · (B / A)^κ · M_verlust` mit `A = S · a_s*` (Game-Design §4.8,
 * §4.13); 0 bei `B = 0`, auch bei `A = 0`. Für nicht einnehmbare Ziele ist `B / A` auf 1 begrenzt,
 * `L` also höchstens `λ · S · M_verlust`. Wegen `M_verlust ≥ 0` sind die Verluste nie negativ.
 */
export function expectedLosses(
  soldiers: Num,
  defense: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  if (!defense.gt(Num.ZERO) || !soldiers.gt(Num.ZERO)) {
    return Num.ZERO;
  }
  // `M_verlust` steckt im Faktor der Obergrenze: eine Multiplikation weniger, neutral bitgleich.
  const cap = soldiers.mul(params.lossFactor * modifierFactor(modifiers.combatLoss));
  const attack = soldierAttack(soldiers, params, modifiers);
  if (!attack.gt(Num.ZERO)) {
    return cap;
  }
  const ratio = defense.div(attack).min(Num.ONE);
  return cap.mul(ratio.pow(params.lossExponent)).min(cap);
}

/**
 * Nahrung aus Gefallenen bei der Ankunft (Autophagie, Game-Design §4.13): `L · ρ · c_s`, nur mit
 * freigeschaltetem `fallenRecycling`, sonst 0.
 */
export function recycledFood(
  losses: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  if (!modifiers.fallenRecycling || !losses.gt(Num.ZERO)) {
    return Num.ZERO;
  }
  return losses.mul(params.fallenRecycleYield * params.soldierCost).max(Num.ZERO);
}

/** Erwarteter Verlustanteil `L / S'` (Game-Design §4.5); 0 bei `L = 0`. */
export function expectedLossShare(losses: Num, soldiers: Num): Num {
  return losses.gt(Num.ZERO) && soldiers.gt(Num.ZERO) ? losses.div(soldiers) : Num.ZERO;
}

/**
 * Ausbeute beim Opfern `η = min(η_0 · M_ausbeute, 1 − v_min)` (Game-Design §4.10, §4.13). Einzige
 * Quelle der Ausbeute: Der Umwandlungsverlust sinkt nie unter `v_min`, egal wie viele Effekte
 * `M_ausbeute` erhöhen.
 */
export function sacrificeYieldShare(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  const yieldModifier = modifierFactor(modifiers.sacrificeYield);
  return Math.min(params.sacrificeYield * yieldModifier, 1 - params.minSacrificeLoss);
}

/** Umwandlungsverlust `1 − η`, vor dem Opfern angezeigt (Game-Design §4.10, US-04.07). */
export function sacrificeLossShare(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return 1 - sacrificeYieldShare(params, modifiers);
}

/** Nahrung aus `n` geopferten Drohnen: `n · η · c_d`, zum Basispreis (Game-Design §4.10). */
export function sacrificeFood(
  count: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return count.mul(sacrificeYieldShare(params, modifiers) * params.droneCost);
}

/**
 * Drohnen je Königin `k_q = Preis_Königin / (η · c_d)` zum aktuellen Königinnenpreis
 * (Game-Design §4.10). Ohne positiven Drohnenwert `η · c_d` ist keine Umwandlung möglich: `null`.
 */
export function dronesPerQueen(
  bought: Units,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num | null {
  const droneValue = sacrificeYieldShare(params, modifiers) * params.droneCost;
  return droneValue > 0 ? unitPrice('queens', bought, params).div(droneValue) : null;
}

/**
 * Effekt einer weiteren Königin: `+e_q · f(P_v) · M_brut` Eier/min, `+p_q*` Platz (Game-Design §4.5,
 * §4.13, §4.15).
 */
export function nextQueenEffect(
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): QueenEffect {
  return {
    eggsPerMin: Num.from(queenEggsPerMinute(pheromones, params, modifiers)),
    space: Num.from(spacePerQueen(params, modifiers)),
  };
}

/** Nahrungsbedarf der Brut bei voller Eierrate: `E / 60 · c̄` (Game-Design §4.3, §4.15). */
export function broodFoodPerSecond(
  units: Units,
  pheromones: Pheromones,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return eggsPerMinute(units, pheromones, params, modifiers)
    .mul(meanBroodCost(pheromones, params))
    .div(SECONDS_PER_MINUTE);
}

/**
 * Nettozufluss: Nahrung/s gesamt minus Nahrungsbedarf der Brut. Kann negativ sein; die Brut pausiert
 * dann real anteilig (Game-Design §4.3), die Nahrung fällt also nicht unter 0.
 */
export function netFoodPerSecond(
  units: Units,
  pheromones: Pheromones,
  stock: Num,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): Num {
  return foodPerSecond(units, stock, params, modifiers).sub(
    broodFoodPerSecond(units, pheromones, params, modifiers),
  );
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

/**
 * Fundchance je Ziehung `p = min(1, p_Typ · M_fund)` eines Futterstellentyps (Game-Design §4.13,
 * §4.16); bis zu den Funden nur Anzeige.
 */
export function siteFindChance(
  type: SiteTypeId,
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return Math.min(
    1,
    params[SITE_TYPE_PARAMS[type].findChance] * modifierFactor(modifiers.findChance),
  );
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

/** Ziehungsgewicht `<id>Weight` eines Eintrags der Fundtabelle (Game-Design §4.16). */
export function findEntryWeight(id: FindEntryId, params: BalanceParams): number {
  return params[FIND_ENTRY_PARAMS[id].weight];
}

/** Zufallsfaktor der Fundmengen `u_F = 1 − σ_F + 2σ_F · r` (Game-Design §4.16). */
export function findSpreadFactor(random: number, params: BalanceParams): number {
  return 1 - params.findSpread + 2 * params.findSpread * random;
}

/**
 * DNA eines Funds `φ_D · d_0 · (b_0 · γ_B^z)^δ · u_F`, wie die DNA eines Schlots in Distanz 1 beim
 * aktuellen Zugzähler `z`, ohne Rundung (Game-Design §4.16).
 */
export function findDna(moves: number, spread: number, params: BalanceParams): Num {
  return Num.from(params.siteDefenseGrowth)
    .pow(moves)
    .mul(params.siteDefenseBase)
    .pow(params.dnaExponent)
    .mul(params.foreignDnaFactor * params.dnaBase * spread);
}

/** Nahrung eines Funds `φ_N · G · u_F` mit der Größe der aktuellen Futterstelle (Game-Design §4.16). */
export function findFood(size: Num, spread: number, params: BalanceParams): Num {
  return size.mul(params.nutrientBubbleShare * spread);
}

/**
 * Neuer Ablauf eines Buffs `max(Ablauf_alt, t) + T_B` in Spielzeit (ms); ein weiterer Fund
 * verlängert einen laufenden Buff (Game-Design §4.16). `previousMs` ist `null` ohne Eintrag.
 */
export function buffExpiresAtMs(
  id: BuffId,
  previousMs: number | null,
  playedMs: number,
  params: BalanceParams,
): number {
  const start = previousMs === null ? playedMs : Math.max(previousMs, playedMs);
  return start + params[FIND_ENTRY_PARAMS[id].seconds] * MS_PER_SECOND;
}

/** Faktor `μ_B` eines Buffs (Game-Design §4.16). */
export function buffFactor(id: BuffId, params: BalanceParams): number {
  return params[FIND_ENTRY_PARAMS[id].factor];
}

/** Zahl der Abbau-Schwellen `n_A` je Futterstelle; als ganze Zahl verwendet (Game-Design §4.16). */
export function harvestDrawCount(params: BalanceParams): number {
  return Math.max(0, Math.floor(params.findHarvestDraws));
}

/**
 * Vorrat an der Abbau-Schwelle `j`: `G · (n_A − j) / n_A`, also abgebauter Anteil `j / n_A`; bei
 * `j = n_A` genau 0 (Game-Design §4.16).
 */
export function harvestThresholdStock(size: Num, threshold: number, params: BalanceParams): Num {
  const count = harvestDrawCount(params);
  return threshold >= count ? Num.ZERO : size.mul((count - threshold) / count);
}

/** Abgebauter Anteil `j / n_A` an der Abbau-Schwelle `j`, höchstens 1 (Game-Design §4.16). */
export function harvestThresholdShare(threshold: number, params: BalanceParams): number {
  const count = harvestDrawCount(params);
  return threshold >= count ? 1 : threshold / count;
}

/**
 * Erreichte Abbau-Schwellen der Futterstelle: größtes `j ≤ n_A` mit `V ≤ G · (n_A − j) / n_A`, 0
 * ohne. Abgeleitet aus `V` und `G`, nicht gespeichert (Game-Design §4.16, §5.1).
 */
export function reachedHarvestThresholds(size: Num, stock: Num, params: BalanceParams): number {
  const count = harvestDrawCount(params);
  let reached = 0;
  while (reached < count && stock.lte(harvestThresholdStock(size, reached + 1, params))) {
    reached++;
  }
  return reached;
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
 * Aktuelle Reichweite `R = R_0 + Σ add(range)` (Game-Design §4.7, §4.13). Einzige Quelle der
 * Reichweite, für Generator, Status und Aufbruch.
 */
export function swarmRange(
  params: BalanceParams,
  modifiers: Modifiers = NEUTRAL_MODIFIERS,
): number {
  return effectValue(params.baseRange, modifiers.range);
}

/** Zusätzliche Pheromonpunkte `P_bonus = Σ add(pheromonePoints)` (Game-Design §4.13, §4.15). */
export function pheromoneBonus(modifiers: Modifiers = NEUTRAL_MODIFIERS): number {
  return effectValue(0, modifiers.pheromonePoints);
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
