/** Fester Logik-Takt der Simulation (technisches Konzept §4). */
export const TICKS_PER_SECOND = 10;

/** Dauer eines Logik-Ticks in Millisekunden. */
export const TICK_MS = 100;

/** Überschreibbare Balance-Werte (Game-Design §2.3, ADR-007). */
export interface BalanceParams {
  /** Grundertrag `g_0` in Nahrung/s (Game-Design §4.1). */
  readonly baseFoodRate: number;
  readonly droneCost: number;
  readonly droneCostGrowth: number;
  readonly droneCollectRate: number;
  readonly droneSpace: number;
  readonly soldierCost: number;
  readonly soldierCostGrowth: number;
  readonly soldierAttack: number;
  readonly soldierSpace: number;
  readonly queenCost: number;
  readonly queenCostGrowth: number;
  readonly queenEggsPerMin: number;
  readonly queenSpace: number;
  readonly broodDroneShare: number;
  readonly startFood: number;
  readonly startQueens: number;
  /** Größe der ersten Futterstelle `s_0` und Basis der Größe aller weiteren (Game-Design §4.6). */
  readonly siteSize: number;
  /** Grundreichweite `R_0` in Distanzeinheiten (Game-Design §4.7). */
  readonly baseRange: number;
  /** Wahrnehmungssaum `m` über die Reichweite hinaus (Game-Design §4.7). */
  readonly perceptionMargin: number;
  /** Kandidaten je Erzeugung `k`; wird als ganze Zahl verwendet (Game-Design §4.6). */
  readonly candidateCount: number;
  readonly candidateMinDistance: number;
  readonly candidateMaxDistance: number;
  readonly siteSizeGrowth: number;
  readonly siteSizeDistanceBonus: number;
  readonly siteDefenseBase: number;
  readonly siteDefenseGrowth: number;
  readonly siteDefenseDistanceBonus: number;
  /** Streuung `σ` der Zufallsfaktoren `u_G`, `u_B` um 1. */
  readonly siteSpread: number;
  readonly dnaBase: number;
  readonly dnaExponent: number;
  readonly lossFactor: number;
  readonly lossExponent: number;
  /** Anteil `ρ` von `c_s`, der je gefallenem Soldat als Nahrung zurückkommt (Autophagie, Game-Design §4.13). */
  readonly fallenRecycleYield: number;
  readonly sacrificeYield: number;
  readonly minSacrificeLoss: number;
  /** Reisedauer `t_r` in Sekunden je Distanzeinheit (Game-Design §4.11). */
  readonly travelSecondsPerDistance: number;
  readonly balancedMaxLossShare: number;
  readonly defaultAutoThreshold: number;
  readonly maxAutoThreshold: number;
  // Futterstellentypen (Game-Design §2.3, `siteTypes`): flach, damit die Modell-Seite sie als Zahlen
  // bearbeiten kann. Je Typ Größe× `f_G`, Abwehr× `f_B`, Fundchance und Ziehungsgewicht `g`.
  readonly algalMatSizeFactor: number;
  readonly algalMatDefenseFactor: number;
  readonly algalMatFindChance: number;
  readonly algalMatWeight: number;
  readonly ventSizeFactor: number;
  readonly ventDefenseFactor: number;
  readonly ventFindChance: number;
  readonly ventWeight: number;
  readonly bacterialMatSizeFactor: number;
  readonly bacterialMatDefenseFactor: number;
  readonly bacterialMatFindChance: number;
  readonly bacterialMatWeight: number;
  readonly methaneSeepSizeFactor: number;
  readonly methaneSeepDefenseFactor: number;
  readonly methaneSeepFindChance: number;
  readonly methaneSeepWeight: number;
  readonly whaleFallSizeFactor: number;
  readonly whaleFallDefenseFactor: number;
  readonly whaleFallFindChance: number;
  readonly whaleFallWeight: number;
}

/** Werte v1 aus Game-Design §2.3. */
export const DEFAULT_BALANCE: BalanceParams = Object.freeze({
  baseFoodRate: 1.5,
  droneCost: 10,
  droneCostGrowth: 1.07,
  droneCollectRate: 0.2,
  droneSpace: 1,
  soldierCost: 25,
  soldierCostGrowth: 1.08,
  soldierAttack: 1,
  soldierSpace: 2,
  queenCost: 60,
  queenCostGrowth: 1.2,
  queenEggsPerMin: 6,
  queenSpace: 10,
  broodDroneShare: 3 / 4,
  startFood: 15,
  startQueens: 1,
  siteSize: 20_000,
  baseRange: 5,
  perceptionMargin: 1,
  candidateCount: 6,
  candidateMinDistance: 1,
  candidateMaxDistance: 7,
  siteSizeGrowth: 1.4,
  siteSizeDistanceBonus: 0.1,
  siteDefenseBase: 20,
  siteDefenseGrowth: 1.35,
  siteDefenseDistanceBonus: 0.15,
  siteSpread: 0.2,
  dnaBase: 1,
  dnaExponent: 0.8,
  lossFactor: 0.5,
  lossExponent: 2,
  fallenRecycleYield: 0.5,
  sacrificeYield: 0.5,
  minSacrificeLoss: 0.1,
  travelSecondsPerDistance: 10,
  balancedMaxLossShare: 0.25,
  defaultAutoThreshold: 0,
  maxAutoThreshold: 0.9,
  algalMatSizeFactor: 0.5,
  algalMatDefenseFactor: 0,
  algalMatFindChance: 0.05,
  algalMatWeight: 1,
  ventSizeFactor: 1,
  ventDefenseFactor: 1,
  ventFindChance: 0.1,
  ventWeight: 1,
  bacterialMatSizeFactor: 1.5,
  bacterialMatDefenseFactor: 2.5,
  bacterialMatFindChance: 0.15,
  bacterialMatWeight: 1,
  methaneSeepSizeFactor: 2.5,
  methaneSeepDefenseFactor: 2,
  methaneSeepFindChance: 0.2,
  methaneSeepWeight: 1,
  whaleFallSizeFactor: 3,
  whaleFallDefenseFactor: 3,
  whaleFallFindChance: 0.3,
  whaleFallWeight: 1,
});
