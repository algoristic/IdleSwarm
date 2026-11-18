import { DEFAULT_BALANCE, TICK_MS, TICKS_PER_SECOND } from './constants';

describe('Takt-Konstanten', () => {
  it('legt 10 Ticks pro Sekunde zu je 100 ms fest', () => {
    expect(TICKS_PER_SECOND).toBe(10);
    expect(TICK_MS).toBe(100);
    expect(TICKS_PER_SECOND * TICK_MS).toBe(1000);
  });
});

describe('DEFAULT_BALANCE', () => {
  it('enthält die Werte v1 aus Game-Design §2.3', () => {
    expect(DEFAULT_BALANCE).toEqual({
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
      broodDroneShare: 0.75,
      startFood: 15,
      startQueens: 1,
      siteSize: 20000,
    });
  });

  it('ist eingefroren', () => {
    expect(Object.isFrozen(DEFAULT_BALANCE)).toBe(true);
  });
});
