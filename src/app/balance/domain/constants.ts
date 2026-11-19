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
  /** Pheromonpunkte auf Drohnen `P_d0` beim Start; ganzzahlig (Game-Design §4.15). */
  readonly startPheromoneDrones: number;
  /** Pheromonpunkte auf Soldaten `P_s0` beim Start; ganzzahlig. `P_0 = P_d0 + P_s0` ist abgeleitet. */
  readonly startPheromoneSoldiers: number;
  /** Basispreis `c_P` eines Drüsenpunkts in Nahrung (Game-Design §4.15). */
  readonly glandCost: number;
  /** Preisfaktor `w_P` der Drüse. */
  readonly glandCostGrowth: number;
  /** DNA-Kosten `c_G` eines Genom-Knotens der Stufe 1 (Game-Design §4.14). */
  readonly genomeCost: number;
  /** Kostenfaktor `w_G` je Stufe; Kosten `round(c_G · w_G^(s−1))`. */
  readonly genomeCostGrowth: number;
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
  // Reguläre Adaptionen (Game-Design §2.3, Parameter je ID, §4.14): Betrag bzw. Faktor des Effekts
  // mit Zahl, zugeordnet über `GENOME_NODE_PARAMS`.
  readonly cilia1Effect: number;
  readonly cilia2Effect: number;
  readonly filterFeederEffect: number;
  readonly chemotaxisEffect: number;
  readonly flagellumEffect: number;
  readonly yolkReserveEffect: number;
  readonly broodCombsEffect: number;
  readonly secondGlandEffect: number;
  readonly nurseCellsEffect: number;
  readonly buddingEffect: number;
  readonly acidVacuoleEffect: number;
  readonly autophagyEffect: number;
  readonly nettleCellsEffect: number;
  readonly chalkShellEffect: number;
  readonly spineCellsEffect: number;
  // Einzigartige Adaptionen (§4.14): Effektwert und benötigte Fragmente, zugeordnet über
  // `UNIQUE_ADAPTATION_PARAMS`.
  readonly thermosynthesisEffect: number;
  readonly thermosynthesisFragments: number;
  readonly algalSymbiosisEffect: number;
  readonly algalSymbiosisFragments: number;
  readonly crystalSenseEffect: number;
  readonly crystalSenseFragments: number;
  readonly sulfurShellEffect: number;
  readonly sulfurShellFragments: number;
  /** Abbau-Ziehungen `n_A` je Futterstelle, bei `j / n_A` abgebautem Vorrat; ganzzahlig (§4.16). */
  readonly findHarvestDraws: number;
  /** Streuung `σ_F` des Zufallsfaktors `u_F` der Fundmengen um 1 (Game-Design §4.16). */
  readonly findSpread: number;
  // Einträge der Fundtabelle (Game-Design §2.3, Parameter je ID, §4.16): Gewicht je Eintrag, dazu
  // `φ_D`, `φ_N` und je Buff Faktor `μ_B` und Dauer `T_B` in s; zugeordnet über `FIND_ENTRY_PARAMS`.
  readonly foreignDnaWeight: number;
  /** `φ_D`: DNA eines Funds relativ zur DNA eines Schlots in Distanz 1 beim aktuellen `z`. */
  readonly foreignDnaFactor: number;
  readonly nutrientBubbleWeight: number;
  /** `φ_N`: Nahrung eines Funds als Anteil der Größe `G` der aktuellen Futterstelle. */
  readonly nutrientBubbleShare: number;
  readonly planktonBloomWeight: number;
  readonly planktonBloomFactor: number;
  readonly planktonBloomSeconds: number;
  readonly warmCurrentWeight: number;
  readonly warmCurrentFactor: number;
  readonly warmCurrentSeconds: number;
  readonly thermophileWeight: number;
  readonly sulfurPearlWeight: number;
  readonly chloroplastWeight: number;
  readonly primalCrystalWeight: number;
  readonly stromatoliteWeight: number;
  readonly biofilmDiscWeight: number;
  readonly greenPearlWeight: number;
  readonly pyriteWeight: number;
  readonly basaltPebbleWeight: number;
  readonly magnetiteWeight: number;
  readonly boneSplinterWeight: number;
  readonly fatPearlWeight: number;
  readonly toothScaleWeight: number;
  readonly pumiceWeight: number;
  readonly foamBallWeight: number;
  readonly clayBeadWeight: number;
  // Badges (Game-Design §4.17): Bonus je Set, zugeordnet über `BADGE_PARAMS`.
  readonly matRelicsBadgeEffect: number;
  readonly deepStonesBadgeEffect: number;
  readonly whaleRelicsBadgeEffect: number;
  readonly driftBadgeEffect: number;
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
  startPheromoneDrones: 3,
  startPheromoneSoldiers: 1,
  glandCost: 100,
  glandCostGrowth: 2,
  genomeCost: 8,
  genomeCostGrowth: Math.sqrt(10),
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
  algalMatFindChance: 0.15,
  algalMatWeight: 1,
  ventSizeFactor: 1,
  ventDefenseFactor: 1,
  ventFindChance: 0.2,
  ventWeight: 1,
  bacterialMatSizeFactor: 1.5,
  bacterialMatDefenseFactor: 2.5,
  bacterialMatFindChance: 0.25,
  bacterialMatWeight: 1,
  methaneSeepSizeFactor: 2.5,
  methaneSeepDefenseFactor: 2,
  methaneSeepFindChance: 0.3,
  methaneSeepWeight: 1,
  whaleFallSizeFactor: 3,
  whaleFallDefenseFactor: 3,
  whaleFallFindChance: 0.4,
  whaleFallWeight: 1,
  cilia1Effect: 0.2,
  cilia2Effect: 0.3,
  filterFeederEffect: 0.25,
  chemotaxisEffect: 1,
  flagellumEffect: 1.5,
  yolkReserveEffect: 0.2,
  broodCombsEffect: 2,
  secondGlandEffect: 1,
  nurseCellsEffect: 0.3,
  buddingEffect: 1.25,
  acidVacuoleEffect: 0.2,
  autophagyEffect: 0.4,
  nettleCellsEffect: 0.75,
  chalkShellEffect: 0.6,
  spineCellsEffect: 0.5,
  thermosynthesisEffect: 0.25,
  thermosynthesisFragments: 3,
  algalSymbiosisEffect: 0.25,
  algalSymbiosisFragments: 2,
  crystalSenseEffect: 0.25,
  crystalSenseFragments: 2,
  sulfurShellEffect: 1,
  sulfurShellFragments: 5,
  findHarvestDraws: 4,
  findSpread: 0.2,
  foreignDnaWeight: 30,
  // Aus der Tabelle „DNA je Fund“ in §4.16 (z = 0: 20^0,8 ≈ 10,99), also ohne Abschlag.
  foreignDnaFactor: 1,
  nutrientBubbleWeight: 20,
  nutrientBubbleShare: 0.05,
  planktonBloomWeight: 8,
  planktonBloomFactor: 1.5,
  planktonBloomSeconds: 600,
  warmCurrentWeight: 8,
  warmCurrentFactor: 1.5,
  warmCurrentSeconds: 600,
  thermophileWeight: 5,
  sulfurPearlWeight: 5,
  chloroplastWeight: 5,
  primalCrystalWeight: 5,
  stromatoliteWeight: 3,
  biofilmDiscWeight: 3,
  greenPearlWeight: 3,
  pyriteWeight: 3,
  basaltPebbleWeight: 3,
  magnetiteWeight: 3,
  boneSplinterWeight: 3,
  fatPearlWeight: 3,
  toothScaleWeight: 3,
  pumiceWeight: 3,
  foamBallWeight: 3,
  clayBeadWeight: 3,
  matRelicsBadgeEffect: 0.05,
  deepStonesBadgeEffect: 0.05,
  whaleRelicsBadgeEffect: 0.95,
  driftBadgeEffect: 0.1,
});
