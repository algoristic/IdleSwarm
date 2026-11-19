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
  });

  it('ist eingefroren', () => {
    expect(Object.isFrozen(DEFAULT_BALANCE)).toBe(true);
  });
});
