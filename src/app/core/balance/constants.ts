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
  readonly siteSize: number;
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
});
