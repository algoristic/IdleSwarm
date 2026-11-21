import { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';
import type { UnitType, Units } from '@app/swarm/domain/models/units.model';

import { BALANCE_V1 } from './balance-v1.testing';
import { combineEffects } from './effects-logic';
import {
  basePheromonePoints,
  distributedPheromonePoints,
  eggsPerPheromonePoint,
  freePheromonePoints,
  glandPrice,
  pheromoneBroodFactor,
  pheromoneDroneShare,
  totalPheromonePoints,
  baseFoodPerSecond,
  broodFoodPerSecond,
  broodResult,
  candidateDefense,
  candidateDistance,
  candidateSize,
  candidateStatus,
  clampAutoThreshold,
  collectGain,
  distanceBetween,
  dnaReward,
  droneFoodPerSecond,
  eggsPerMinute,
  foodPerSecond,
  isAffordable,
  isSpaceWarning,
  meanBroodCost,
  netFoodPerSecond,
  nextQueenEffect,
  positionAt,
  secondsUntilAffordable,
  siteFindChance,
  siteSecondsLeft,
  siteTypeWeight,
  spaceAvailable,
  spaceUsage,
  spaceUsed,
  spreadFactor,
  swarmRange,
  totalAttack,
  travelDurationMs,
  maxCatchUpMs,
  unitPrice,
  weightedIndex,
  carriedUnits,
  dronesPerQueen,
  expectedLossShare,
  expectedLosses,
  isCapturable,
  sacrificeFood,
  sacrificeLossShare,
  sacrificeYieldShare,
  buffExpiresAtMs,
  findDna,
  findFood,
  findSpreadFactor,
  harvestThresholdShare,
  harvestThresholdStock,
  reachedHarvestThresholds,
} from './formulas';

/** Startverteilung 3 : 1 ohne Drüsenpunkte (Game-Design §2.1). */
const START_PHEROMONES: Pheromones = Object.freeze({ drones: 3, soldiers: 1, glands: 0 });

function pheromones(drones: number, soldiers: number, glands = 0): Pheromones {
  return Object.freeze({ drones, soldiers, glands });
}

function units(queens: number, drones: number, soldiers: number): Units {
  return Object.freeze({
    queens: Num.from(queens),
    drones: Num.from(drones),
    soldiers: Num.from(soldiers),
  });
}

describe('unitPrice', () => {
  // Game-Design §3, dort auf zwei Stellen gerundet.
  const TABLE: readonly (readonly [n: number, drones: number, soldiers: number, queens: number])[] =
    [
      [0, 10, 25, 60],
      [1, 10.7, 27, 72],
      [5, 14.03, 36.73, 149.3],
      [10, 19.67, 53.97, 371.5],
      [20, 38.7, 116.52, 2300.26],
    ];

  it.each(TABLE)('folgt der Preistabelle bei n = %d', (n, drones, soldiers, queens) => {
    const bought = units(n, n, n);
    expect(unitPrice('drones', bought, BALANCE_V1).toNumber()).toBeCloseTo(drones, 2);
    expect(unitPrice('soldiers', bought, BALANCE_V1).toNumber()).toBeCloseTo(soldiers, 2);
    expect(unitPrice('queens', bought, BALANCE_V1).toNumber()).toBeCloseTo(queens, 2);
  });

  it('rechnet ungerundet', () => {
    expect(unitPrice('drones', units(0, 5, 0), BALANCE_V1).toNumber()).toBeCloseTo(14.0255173, 6);
  });

  it('zählt nur den Kaufzähler des eigenen Typs', () => {
    expect(unitPrice('drones', units(9, 0, 9), BALANCE_V1).eq(10)).toBe(true);
    expect(unitPrice('soldiers', units(9, 9, 0), BALANCE_V1).eq(25)).toBe(true);
    expect(unitPrice('queens', units(0, 9, 9), BALANCE_V1).eq(60)).toBe(true);
  });

  it.each<[UnitType, Partial<typeof BALANCE_V1>, number]>([
    ['drones', { droneCost: 100, droneCostGrowth: 2 }, 400],
    ['soldiers', { soldierCost: 3, soldierCostGrowth: 3 }, 27],
    ['queens', { queenCost: 5, queenCostGrowth: 10 }, 500],
  ])('nutzt überschriebene Parameter für %s', (type, override, expected) => {
    const params = { ...BALANCE_V1, ...override };
    expect(unitPrice(type, units(2, 2, 2), params).eq(expected)).toBe(true);
  });
});

describe('droneFoodPerSecond', () => {
  it('rechnet Drohnen mal Sammelrate', () => {
    expect(droneFoodPerSecond(units(1, 50, 0), Num.from(100), BALANCE_V1).eq(10)).toBe(true);
  });

  it('ist bei leerem Vorrat oder ohne Drohnen 0', () => {
    expect(droneFoodPerSecond(units(1, 50, 0), Num.ZERO, BALANCE_V1).isZero()).toBe(true);
    expect(droneFoodPerSecond(units(1, 0, 0), Num.from(100), BALANCE_V1).isZero()).toBe(true);
  });

  it('wird nicht durch einen kleinen Vorrat begrenzt', () => {
    expect(droneFoodPerSecond(units(1, 50, 0), Num.from(0.5), BALANCE_V1).eq(10)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, droneCollectRate: 3 };
    expect(droneFoodPerSecond(units(1, 2, 0), Num.from(1), params).eq(6)).toBe(true);
  });
});

describe('baseFoodPerSecond', () => {
  it('liefert den Grundertrag, auch ohne Einheiten', () => {
    expect(baseFoodPerSecond(Num.from(100), BALANCE_V1).eq(1.5)).toBe(true);
  });

  it('ist bei leerem Vorrat 0', () => {
    expect(baseFoodPerSecond(Num.ZERO, BALANCE_V1).isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 4 };
    expect(baseFoodPerSecond(Num.from(1), params).eq(4)).toBe(true);
  });
});

describe('foodPerSecond', () => {
  it('addiert Grundertrag und Drohnen', () => {
    expect(foodPerSecond(units(1, 50, 0), Num.from(100), BALANCE_V1).eq(11.5)).toBe(true);
  });

  it('liefert ohne Drohnen den Grundertrag', () => {
    expect(foodPerSecond(units(1, 0, 0), Num.from(100), BALANCE_V1).eq(1.5)).toBe(true);
  });

  it('ist bei leerem Vorrat 0', () => {
    expect(foodPerSecond(units(1, 50, 0), Num.ZERO, BALANCE_V1).isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 1, droneCollectRate: 3 };
    expect(foodPerSecond(units(1, 2, 0), Num.from(1), params).eq(7)).toBe(true);
  });
});

describe('collectGain', () => {
  it('rechnet Grundertrag und Sammeln aus Beispiel 1 in Game-Design §4.3', () => {
    const gain = collectGain(units(1, 10, 0), Num.from(1000), 100, BALANCE_V1);
    expect(gain.toNumber()).toBeCloseTo(0.35, 12);
  });

  it('liefert ohne Drohnen den Grundertrag', () => {
    const gain = collectGain(units(1, 0, 0), Num.from(1000), 100, BALANCE_V1);
    expect(gain.toNumber()).toBeCloseTo(0.15, 12);
  });

  it('begrenzt die Menge auf den Vorrat', () => {
    const stock = Num.from(0.05);
    expect(collectGain(units(1, 10, 0), stock, 100, BALANCE_V1)).toBe(stock);
    expect(collectGain(units(1, 0, 0), stock, 100, BALANCE_V1)).toBe(stock);
  });

  it.each([
    [1, 0.0035],
    [16, 0.056],
    [60_000, 210],
  ])('rechnet mit beliebiger Schrittdauer (%d ms)', (dtMs, expected) => {
    const gain = collectGain(units(1, 10, 0), Num.from(1000), dtMs, BALANCE_V1);
    expect(gain.toNumber()).toBeCloseTo(expected, 12);
  });

  it.each([
    ['bei leerem Vorrat', 10, 0, 100],
    ['ohne Zeit', 10, 100, 0],
  ])('liefert %s nichts', (_name, drones, stock, dtMs) => {
    const gain = collectGain(units(1, drones, 0), Num.from(stock), dtMs, BALANCE_V1);
    expect(gain.isZero()).toBe(true);
  });

  it('liefert ohne Drohnen und ohne Grundertrag nichts', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 0 };
    expect(collectGain(units(1, 0, 0), Num.from(100), 100, params).isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 1, droneCollectRate: 3 };
    expect(collectGain(units(1, 2, 0), Num.from(100), 1000, params).eq(7)).toBe(true);
  });
});

describe('siteSecondsLeft', () => {
  it('rechnet das Beispiel aus Game-Design §4.5', () => {
    const left = siteSecondsLeft(units(1, 50, 0), Num.from(20000), BALANCE_V1);
    expect(left?.toNumber()).toBeCloseTo(20000 / 11.5, 9);
  });

  it('schätzt auch ohne Drohnen über den Grundertrag', () => {
    const left = siteSecondsLeft(units(1, 0, 0), Num.from(20000), BALANCE_V1);
    expect(left?.toNumber()).toBeCloseTo(20000 / 1.5, 9);
  });

  it('liefert ohne Abbaurate keine Schätzung, auch bei leerem Vorrat', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 0 };
    expect(siteSecondsLeft(units(1, 0, 0), Num.from(20000), params)).toBeNull();
    expect(siteSecondsLeft(units(1, 0, 0), Num.ZERO, params)).toBeNull();
  });

  it('ist bei leerem Vorrat 0', () => {
    expect(siteSecondsLeft(units(1, 50, 0), Num.ZERO, BALANCE_V1)?.isZero()).toBe(true);
    expect(siteSecondsLeft(units(1, 0, 0), Num.ZERO, BALANCE_V1)?.isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, baseFoodRate: 0, droneCollectRate: 2 };
    expect(siteSecondsLeft(units(1, 5, 0), Num.from(100), params)?.eq(10)).toBe(true);
  });
});

describe('eggsPerMinute', () => {
  it('rechnet Königinnen mal Eier je Königin', () => {
    expect(eggsPerMinute(units(3, 7, 7), START_PHEROMONES, BALANCE_V1).eq(18)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, queenEggsPerMin: 2.5 };
    expect(eggsPerMinute(units(2, 0, 0), START_PHEROMONES, params).eq(5)).toBe(true);
  });
});

describe('meanBroodCost', () => {
  it('liefert 13,75 mit den Startwerten', () => {
    expect(meanBroodCost(START_PHEROMONES, BALANCE_V1)).toBe(13.75);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, droneCost: 2, soldierCost: 4 };
    expect(meanBroodCost(pheromones(2, 2), params)).toBe(3);
  });
});

describe('broodResult', () => {
  it('brütet bei genug Nahrung alle Eier des Schritts aus', () => {
    const brood = broodResult(units(1, 10, 0), START_PHEROMONES, Num.from(5.2), 100, BALANCE_V1);
    expect(brood.hatched.eq(0.01)).toBe(true);
    expect(brood.drones.eq(0.0075)).toBe(true);
    expect(brood.soldiers.eq(0.0025)).toBe(true);
    expect(brood.foodCost.eq(0.1375)).toBe(true);
  });

  it('begrenzt die Brut auf die vorhandene Nahrung', () => {
    const food = Num.from(0.05);
    const brood = broodResult(units(1, 0, 0), START_PHEROMONES, food, 100, BALANCE_V1);
    expect(brood.hatched.toNumber()).toBeCloseTo(0.05 / 13.75, 12);
    expect(brood.foodCost.eq(food)).toBe(true);
  });

  it('verbraucht genau passende Nahrung vollständig', () => {
    const food = Num.from(0.1375);
    const brood = broodResult(units(1, 0, 0), START_PHEROMONES, food, 100, BALANCE_V1);
    expect(brood.hatched.eq(0.01)).toBe(true);
    expect(brood.foodCost.eq(food)).toBe(true);
  });

  it.each([
    ['ohne Königinnen', 0, 10, 100],
    ['ohne Nahrung', 1, 0, 100],
    ['ohne Zeit', 1, 10, 0],
  ])('brütet %s nichts aus', (_name, queens, food, dtMs) => {
    const brood = broodResult(
      units(queens, 0, 0),
      START_PHEROMONES,
      Num.from(food),
      dtMs,
      BALANCE_V1,
    );
    expect(brood.hatched.isZero()).toBe(true);
    expect(brood.drones.isZero()).toBe(true);
    expect(brood.soldiers.isZero()).toBe(true);
    expect(brood.foodCost.isZero()).toBe(true);
  });

  it('wird bei Kosten von 0 nicht durch Nahrung begrenzt', () => {
    const params = { ...BALANCE_V1, droneCost: 0, soldierCost: 0 };
    const brood = broodResult(units(1, 0, 0), START_PHEROMONES, Num.ZERO, 1000, params);
    expect(brood.hatched.eq(0.1)).toBe(true);
    expect(brood.foodCost.isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = {
      ...BALANCE_V1,
      queenEggsPerMin: 60,
      droneCost: 2,
      soldierCost: 4,
    };
    const brood = broodResult(units(2, 0, 0), pheromones(2, 2), Num.from(100), 1000, params);
    expect(brood.hatched.eq(2)).toBe(true);
    expect(brood.drones.eq(1)).toBe(true);
    expect(brood.soldiers.eq(1)).toBe(true);
    expect(brood.foodCost.eq(6)).toBe(true);
  });
});

describe('Pheromone', () => {
  const secondGland = combineEffects([{ target: 'pheromonePoints', op: 'add', value: 1 }], null);

  it('bezieht sich auf P_0 = P_d0 + P_s0 = 4', () => {
    expect(basePheromonePoints(BALANCE_V1)).toBe(4);
    expect(totalPheromonePoints(START_PHEROMONES, BALANCE_V1)).toBe(4);
    expect(distributedPheromonePoints(START_PHEROMONES)).toBe(4);
    expect(freePheromonePoints(START_PHEROMONES, BALANCE_V1)).toBe(0);
  });

  it('rechnet P_ges = P_0 + k + P_bonus', () => {
    expect(totalPheromonePoints(pheromones(3, 1, 2), BALANCE_V1)).toBe(6);
    expect(totalPheromonePoints(pheromones(3, 1, 2), BALANCE_V1, secondGland)).toBe(7);
    expect(freePheromonePoints(pheromones(3, 1, 2), BALANCE_V1, secondGland)).toBe(3);
  });

  it('ergibt beim Start f = 1 und a = 3/4, also genau die Brut aus M1.2', () => {
    expect(pheromoneBroodFactor(START_PHEROMONES, BALANCE_V1)).toBe(1);
    expect(pheromoneDroneShare(START_PHEROMONES)).toBe(0.75);
    expect(eggsPerMinute(units(1, 0, 0), START_PHEROMONES, BALANCE_V1).eq(6)).toBe(true);
    expect(meanBroodCost(START_PHEROMONES, BALANCE_V1)).toBe(13.75);
  });

  it('bringt mit einem weiteren verteilten Punkt +25 % Eier/min', () => {
    const more = pheromones(4, 1, 1);
    expect(pheromoneBroodFactor(more, BALANCE_V1)).toBe(1.25);
    expect(eggsPerMinute(units(1, 0, 0), more, BALANCE_V1).eq(7.5)).toBe(true);
    expect(pheromoneDroneShare(more)).toBe(0.8);
  });

  it('lässt freie Punkte nicht brüten', () => {
    const free = pheromones(3, 1, 1);
    expect(freePheromonePoints(free, BALANCE_V1)).toBe(1);
    expect(pheromoneBroodFactor(free, BALANCE_V1)).toBe(1);
  });

  it('lässt die Brut bei P_v = 0 ruhen', () => {
    const none = pheromones(0, 0);
    expect(pheromoneBroodFactor(none, BALANCE_V1)).toBe(0);
    expect(pheromoneDroneShare(none)).toBe(0);
    expect(Number.isFinite(meanBroodCost(none, BALANCE_V1))).toBe(true);
    expect(eggsPerMinute(units(3, 0, 0), none, BALANCE_V1).isZero()).toBe(true);
    const brood = broodResult(units(3, 0, 0), none, Num.from(100), 1000, BALANCE_V1);
    expect(brood.hatched.isZero()).toBe(true);
    expect(brood.foodCost.isZero()).toBe(true);
    expect(broodFoodPerSecond(units(3, 0, 0), none, BALANCE_V1).isZero()).toBe(true);
  });

  it('lässt bei P_v > P_ges nur P_ges Punkte mit demselben Anteil wirken', () => {
    // Nur nach einem Absenken von P_0 über params möglich (Game-Design §4.15).
    const params = { ...BALANCE_V1, startPheromoneDrones: 1, startPheromoneSoldiers: 1 };
    expect(totalPheromonePoints(START_PHEROMONES, params)).toBe(2);
    expect(freePheromonePoints(START_PHEROMONES, params)).toBe(0);
    expect(pheromoneBroodFactor(START_PHEROMONES, params)).toBe(1);
    expect(pheromoneDroneShare(START_PHEROMONES)).toBe(0.75);
    expect(pheromoneBroodFactor(pheromones(6, 2), BALANCE_V1)).toBe(1);
  });

  it('brütet ohne Startpunkte P_0 nicht', () => {
    const params = { ...BALANCE_V1, startPheromoneDrones: 0, startPheromoneSoldiers: 0 };
    expect(pheromoneBroodFactor(pheromones(2, 1, 3), params)).toBe(0);
    expect(eggsPerPheromonePoint(units(1, 0, 0), params).isZero()).toBe(true);
  });

  it('zeigt vor dem Kauf +Q · e_q · M_brut / P_0 Eier/min je Punkt', () => {
    expect(eggsPerPheromonePoint(units(1, 0, 0), BALANCE_V1).eq(1.5)).toBe(true);
    expect(eggsPerPheromonePoint(units(10, 0, 0), BALANCE_V1).eq(15)).toBe(true);
    const faster = combineEffects([{ target: 'broodRate', op: 'add', value: 1 }], null);
    expect(eggsPerPheromonePoint(units(10, 0, 0), BALANCE_V1, faster).eq(30)).toBe(true);
  });

  it('rechnet Beispiel 11 aus Game-Design §4.15', () => {
    const queens = units(10, 0, 0);
    expect(eggsPerMinute(queens, START_PHEROMONES, BALANCE_V1).eq(60)).toBe(true);
    expect(meanBroodCost(START_PHEROMONES, BALANCE_V1)).toBe(13.75);
    expect(broodFoodPerSecond(queens, START_PHEROMONES, BALANCE_V1).toNumber()).toBeCloseTo(
      13.75,
      10,
    );
    expect(glandPrice(START_PHEROMONES, BALANCE_V1).eq(100)).toBe(true);
    const bought = pheromones(3, 1, 1);
    expect(totalPheromonePoints(bought, BALANCE_V1)).toBe(5);
    expect(freePheromonePoints(bought, BALANCE_V1)).toBe(1);
    expect(eggsPerMinute(queens, bought, BALANCE_V1).eq(60)).toBe(true);
    const spent = pheromones(4, 1, 1);
    expect(eggsPerMinute(queens, spent, BALANCE_V1).eq(75)).toBe(true);
    expect(pheromoneDroneShare(spent)).toBe(0.8);
    expect(meanBroodCost(spent, BALANCE_V1)).toBe(13);
    expect(broodFoodPerSecond(queens, spent, BALANCE_V1).toNumber()).toBeCloseTo(16.25, 10);
  });

  it('teilt die Brut im Verhältnis P_d : P_s', () => {
    const brood = broodResult(units(1, 0, 0), pheromones(1, 3), Num.from(1000), 60_000, BALANCE_V1);
    expect(brood.hatched.eq(6)).toBe(true);
    expect(brood.drones.eq(1.5)).toBe(true);
    expect(brood.soldiers.eq(4.5)).toBe(true);
  });
});

describe('glandPrice', () => {
  it.each([
    [0, 100],
    [1, 200],
    [2, 400],
    [5, 3200],
    [10, 102_400],
    [20, 104_857_600],
  ])('kostet bei k = %d %d Nahrung (Game-Design §4.15)', (glands, price) => {
    expect(glandPrice(pheromones(3, 1, glands), BALANCE_V1).eq(price)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, glandCost: 50, glandCostGrowth: 3 };
    expect(glandPrice(pheromones(3, 1, 2), params).eq(450)).toBe(true);
  });
});

describe('totalAttack', () => {
  it('rechnet Soldaten mal Angriff je Soldat', () => {
    expect(totalAttack(units(1, 9, 4), BALANCE_V1).eq(4)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    expect(totalAttack(units(1, 0, 4), { ...BALANCE_V1, soldierAttack: 3 }).eq(12)).toBe(true);
  });
});

describe('Platz', () => {
  it('rechnet das Beispiel aus Game-Design §4.5', () => {
    const swarm = units(2, 15, 3);
    expect(spaceUsed(swarm, BALANCE_V1).eq(21)).toBe(true);
    expect(spaceAvailable(swarm, BALANCE_V1).eq(20)).toBe(true);
    expect(spaceUsage(swarm, BALANCE_V1)?.eq(1.05)).toBe(true);
    expect(isSpaceWarning(swarm, BALANCE_V1)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, queenSpace: 4, droneSpace: 2, soldierSpace: 5 };
    const swarm = units(2, 1, 1);
    expect(spaceAvailable(swarm, params).eq(8)).toBe(true);
    expect(spaceUsed(swarm, params).eq(7)).toBe(true);
    expect(spaceUsage(swarm, params)?.eq(0.875)).toBe(true);
  });

  it.each([
    [17, false],
    [17.999, false],
    [18, true],
    [19, true],
  ])('warnt bei %d von 20 belegten Plätzen: %s', (drones, expected) => {
    expect(isSpaceWarning(units(2, drones, 0), BALANCE_V1)).toBe(expected);
  });

  it('warnt bei leerem Schwarm mit Königin nicht', () => {
    expect(isSpaceWarning(units(1, 0, 0), BALANCE_V1)).toBe(false);
    expect(spaceUsage(units(1, 0, 0), BALANCE_V1)?.isZero()).toBe(true);
  });

  it.each([
    [0, 0],
    [5, 1],
  ])('behandelt 0 verfügbaren Platz bei %d Drohnen, %d Soldaten', (drones, soldiers) => {
    const swarm = units(0, drones, soldiers);
    expect(spaceAvailable(swarm, BALANCE_V1).isZero()).toBe(true);
    expect(spaceUsage(swarm, BALANCE_V1)).toBeNull();
    expect(isSpaceWarning(swarm, BALANCE_V1)).toBe(true);
  });
});

describe('nextQueenEffect', () => {
  it('liefert Eier/min und Platz einer Königin', () => {
    const effect = nextQueenEffect(START_PHEROMONES, BALANCE_V1);
    expect(effect.eggsPerMin.eq(6)).toBe(true);
    expect(effect.space.eq(10)).toBe(true);
  });

  it('entspricht der Differenz nach einer weiteren Königin', () => {
    const effect = nextQueenEffect(START_PHEROMONES, BALANCE_V1);
    const before = units(2, 0, 0);
    const after = units(3, 0, 0);
    expect(
      eggsPerMinute(after, START_PHEROMONES, BALANCE_V1)
        .sub(eggsPerMinute(before, START_PHEROMONES, BALANCE_V1))
        .eq(effect.eggsPerMin),
    ).toBe(true);
    expect(
      spaceAvailable(after, BALANCE_V1).sub(spaceAvailable(before, BALANCE_V1)).eq(effect.space),
    ).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const effect = nextQueenEffect(START_PHEROMONES, {
      ...BALANCE_V1,
      queenEggsPerMin: 9,
      queenSpace: 3,
    });
    expect(effect.eggsPerMin.eq(9)).toBe(true);
    expect(effect.space.eq(3)).toBe(true);
  });
});

describe('broodFoodPerSecond', () => {
  it('rechnet den Bedarf bei voller Eierrate', () => {
    expect(broodFoodPerSecond(units(2, 0, 0), START_PHEROMONES, BALANCE_V1).toNumber()).toBeCloseTo(
      2.75,
      10,
    );
  });
});

describe('netFoodPerSecond', () => {
  it('zieht die Brutkosten von Grundertrag und Sammeln ab', () => {
    const net = netFoodPerSecond(units(1, 10, 0), START_PHEROMONES, Num.from(100), BALANCE_V1);
    expect(net.toNumber()).toBeCloseTo(2.125, 10);
  });

  it('wird ohne Vorrat negativ', () => {
    const net = netFoodPerSecond(units(1, 10, 0), START_PHEROMONES, Num.ZERO, BALANCE_V1);
    expect(net.toNumber()).toBeCloseTo(-1.375, 10);
  });
});

describe('isAffordable', () => {
  it('verlangt N ≥ Preis', () => {
    expect(isAffordable(Num.from(10), Num.from(10))).toBe(true);
    expect(isAffordable(Num.from(10), Num.from(9.99))).toBe(false);
  });

  it('lehnt negative Preise ab', () => {
    expect(isAffordable(Num.from(-1), Num.from(10))).toBe(false);
  });
});

describe('secondsUntilAffordable', () => {
  it('ist 0, wenn der Preis schon bezahlbar ist', () => {
    expect(secondsUntilAffordable(Num.from(5), Num.from(5), Num.ZERO)?.isZero()).toBe(true);
  });

  it('teilt den Fehlbetrag durch den Zufluss', () => {
    expect(secondsUntilAffordable(Num.from(10), Num.from(4), Num.from(2))?.eq(3)).toBe(true);
  });

  it('liefert null ohne positiven Zufluss oder bei negativem Preis', () => {
    expect(secondsUntilAffordable(Num.from(10), Num.ZERO, Num.ZERO)).toBeNull();
    expect(secondsUntilAffordable(Num.from(10), Num.ZERO, Num.from(-1))).toBeNull();
    expect(secondsUntilAffordable(Num.from(-1), Num.ZERO, Num.ONE)).toBeNull();
  });
});

describe('Futterstellen-Generator (Game-Design §4.6)', () => {
  // Beispiel 3: Kandidaten beim Spielstart mit z = 0.
  const EXAMPLE_3: readonly (readonly [
    type: SiteTypeId,
    distance: number,
    sizeSpread: number,
    defenseSpread: number,
    size: number,
    defense: number,
    dna: number,
  ])[] = [
    ['vent', 3, 0.9, 1.0, 30240, 26, 13.55],
    ['bacterial-mat', 3, 1.1, 0.8, 55440, 52, 23.59],
    // 20.000 · 1,4 · 0,5 · (1 + 0,1 · 1) · 1,1 = 16.940.
    ['algal-mat', 2, 1.1, 1.0, 16940, 0, 0],
    ['vent', 1, 1.0, 1.0, 28000, 20, 10.99],
    ['whale-fall', 5.8, 1.0, 1.0, 124320, 103, 40.76],
    ['methane-seep', 6.5, 1.0, 1.0, 108500, 73, 30.95],
  ];

  it.each(EXAMPLE_3)(
    'berechnet %s bei d = %d: Größe, Abwehr und DNA aus Beispiel 3',
    (type, distance, sizeSpread, defenseSpread, size, defense, dna) => {
      const g = candidateSize(type, distance, 0, sizeSpread, BALANCE_V1);
      const b = candidateDefense(type, distance, 0, defenseSpread, BALANCE_V1);
      expect(g.toNumber()).toBeCloseTo(size, 6);
      expect(b.toNumber()).toBe(defense);
      expect(dnaReward(b, BALANCE_V1).toNumber()).toBeCloseTo(dna, 2);
    },
  );

  it('macht beim Ersatz K4 zur Algenmatte mit Größe 14.000', () => {
    expect(candidateSize('algal-mat', 1, 0, 1, BALANCE_V1).toNumber()).toBeCloseTo(14000, 6);
  });

  it('wächst je Weiterzug um γ_G bzw. γ_B', () => {
    // z = 1: G = 20.000 · 1,4² · 1 · 1 · 1 = 39.200, B = round(20 · 1,35) = 27.
    expect(candidateSize('vent', 1, 1, 1, BALANCE_V1).toNumber()).toBeCloseTo(39200, 6);
    expect(candidateDefense('vent', 1, 1, 1, BALANCE_V1).toNumber()).toBe(27);
  });

  it('rundet die Abwehr kaufmännisch', () => {
    const at = (base: number): number =>
      candidateDefense('vent', 1, 0, 1, { ...BALANCE_V1, siteDefenseBase: base }).toNumber();
    expect(at(20.5)).toBe(21);
    expect(at(20.49)).toBe(20);
    expect(at(0.4)).toBe(0);
  });

  it('bildet die Ziehungen auf Distanz und Zufallsfaktor ab', () => {
    expect(candidateDistance(0, BALANCE_V1)).toBe(1);
    expect(candidateDistance(0.5, BALANCE_V1)).toBe(4);
    expect(spreadFactor(0, BALANCE_V1)).toBeCloseTo(0.8, 12);
    expect(spreadFactor(0.5, BALANCE_V1)).toBeCloseTo(1, 12);
  });

  it('zieht gewichtet: erster Typ, dessen Summe r · Σg übersteigt', () => {
    const equal = [1, 1, 1, 1, 1];
    expect(weightedIndex(0, equal)).toBe(0);
    expect(weightedIndex(0.19, equal)).toBe(0);
    expect(weightedIndex(0.2, equal)).toBe(1);
    expect(weightedIndex(0.999, equal)).toBe(4);
    expect(weightedIndex(0, [0, 2, 1])).toBe(1);
    expect(weightedIndex(0.7, [0, 2, 1])).toBe(2);
    expect(weightedIndex(0.5, [0, 0])).toBe(0);
  });

  it('liest Gewicht und Fundchance aus der Typtabelle', () => {
    expect(siteTypeWeight('whale-fall', BALANCE_V1)).toBe(1);
    // Fundchancen ab M1.3 (Game-Design §2.3).
    expect(siteFindChance('algal-mat', BALANCE_V1)).toBe(0.15);
    expect(siteFindChance('vent', BALANCE_V1)).toBe(0.2);
    expect(siteFindChance('bacterial-mat', BALANCE_V1)).toBe(0.25);
    expect(siteFindChance('methane-seep', BALANCE_V1)).toBe(0.3);
    expect(siteFindChance('whale-fall', BALANCE_V1)).toBe(0.4);
  });

  it('liefert keine DNA ohne Abwehr', () => {
    expect(dnaReward(Num.ZERO, BALANCE_V1).isZero()).toBe(true);
  });

  it('setzt Positionen in Distanz und Winkel um den Ursprung', () => {
    const position = positionAt({ x: 1, y: 2 }, 2, Math.PI / 2);
    expect(position.x).toBeCloseTo(1, 12);
    expect(position.y).toBeCloseTo(4, 12);
    expect(distanceBetween({ x: 1, y: 2 }, { x: 4, y: 6 })).toBe(5);
  });
});

describe('Reichweite und Sichtbarkeit (Game-Design §4.7)', () => {
  it('nimmt die Grundreichweite', () => {
    expect(swarmRange(BALANCE_V1)).toBe(5);
    expect(swarmRange({ ...BALANCE_V1, baseRange: 8 })).toBe(8);
  });

  it.each([
    [3, 5, 'in-range'],
    [5, 5, 'in-range'],
    [5.8, 5, 'out-of-range'],
    [6, 5, 'out-of-range'],
    [6.01, 5, 'unexplored'],
    [6.5, 5, 'unexplored'],
    [5.8, 6, 'in-range'],
    [6.5, 6, 'out-of-range'],
  ] as const)('d = %d bei R = %d ist %s', (distance, range, status) => {
    expect(candidateStatus(distance, range, BALANCE_V1)).toBe(status);
  });

  it('toleriert Rundungsfehler an der Grenze', () => {
    expect(candidateStatus(5 + 1e-12, 5, BALANCE_V1)).toBe('in-range');
  });

  it('nutzt den Wahrnehmungssaum aus den Parametern', () => {
    expect(candidateStatus(6.5, 5, { ...BALANCE_V1, perceptionMargin: 2 })).toBe('out-of-range');
  });
});

describe('travelDurationMs', () => {
  it('rechnet d · t_r in Millisekunden (Beispiel 7: d = 3 ⇒ 30 s)', () => {
    expect(travelDurationMs(3, BALANCE_V1)).toBe(30_000);
    expect(travelDurationMs(0, BALANCE_V1)).toBe(0);
    expect(travelDurationMs(2.5, { ...BALANCE_V1, travelSecondsPerDistance: 4 })).toBe(10_000);
  });
});

describe('maxCatchUpMs', () => {
  it('rechnet T_max von Stunden in Millisekunden (Start 24 h)', () => {
    expect(maxCatchUpMs(BALANCE_V1)).toBe(86_400_000);
    expect(maxCatchUpMs({ ...BALANCE_V1, maxCatchUpHours: 0.5 })).toBe(1_800_000);
    expect(maxCatchUpMs({ ...BALANCE_V1, maxCatchUpHours: -1 })).toBe(0);
  });
});

describe('clampAutoThreshold', () => {
  it('begrenzt auf [0; θ_max]', () => {
    expect(clampAutoThreshold(0, BALANCE_V1)).toBe(0);
    expect(clampAutoThreshold(0.5, BALANCE_V1)).toBe(0.5);
    expect(clampAutoThreshold(1, BALANCE_V1)).toBe(0.9);
    expect(clampAutoThreshold(-0.1, BALANCE_V1)).toBe(0);
  });
});

describe('Kampf (Game-Design §4.8)', () => {
  it('rechnet Beispiel 4: S = 34 gegen B = 26', () => {
    const losses = expectedLosses(Num.from(34), Num.from(26), BALANCE_V1);
    expect(isCapturable(Num.from(34), Num.from(26))).toBe(true);
    expect(losses.toNumber()).toBeCloseTo(9.94, 2);
    expect(expectedLossShare(losses, Num.from(34)).toNumber()).toBeCloseTo(0.292, 3);
    expect(dnaReward(Num.from(26), BALANCE_V1).toNumber()).toBeCloseTo(13.55, 2);
  });

  it('rechnet K4 aus Beispiel 8: S = 34 gegen B = 20', () => {
    const losses = expectedLosses(Num.from(34), Num.from(20), BALANCE_V1);
    expect(losses.toNumber()).toBeCloseTo(5.88, 2);
    expect(expectedLossShare(losses, Num.from(34)).toNumber()).toBeCloseTo(0.173, 3);
  });

  it('beurteilt K2 (B = 52) bei A = 34 als zu stark', () => {
    expect(isCapturable(Num.from(34), Num.from(52))).toBe(false);
  });

  it('ist bei A = B einnehmbar und verliert dann λ · S', () => {
    expect(isCapturable(Num.from(26), Num.from(26))).toBe(true);
    expect(expectedLosses(Num.from(26), Num.from(26), BALANCE_V1).eq(13)).toBe(true);
  });

  it.each([
    [0, 0],
    [34, 0],
  ])('verliert bei S = %d gegen B = 0 nichts', (soldiers, defense) => {
    const losses = expectedLosses(Num.from(soldiers), Num.from(defense), BALANCE_V1);
    expect(losses.isZero()).toBe(true);
    expect(isCapturable(Num.from(soldiers), Num.from(defense))).toBe(true);
    expect(expectedLossShare(losses, Num.from(soldiers)).isZero()).toBe(true);
  });

  it('verliert ohne Soldaten nichts, auch gegen Abwehr', () => {
    expect(expectedLosses(Num.ZERO, Num.from(26), BALANCE_V1).isZero()).toBe(true);
    expect(isCapturable(Num.ZERO, Num.from(26))).toBe(false);
  });

  it('begrenzt die Verluste gegen zu starke Ziele auf λ · S', () => {
    expect(expectedLosses(Num.from(10), Num.from(52), BALANCE_V1).eq(5)).toBe(true);
    const noAttack = { ...BALANCE_V1, soldierAttack: 0 };
    expect(expectedLosses(Num.from(10), Num.from(1), noAttack).eq(5)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...BALANCE_V1, lossFactor: 0.4, lossExponent: 1, soldierAttack: 2 };
    // A = 20, L = 10 · 0,4 · (10 / 20)^1 = 2
    expect(expectedLosses(Num.from(10), Num.from(10), params).eq(2)).toBe(true);
  });
});

describe('carriedUnits (Game-Design §4.9)', () => {
  // Beispiel 5: C = 200, O = 760.
  const swarm = units(20, 500, 130);

  it('teilt bei „ausgewogen“ beide Typen mit C / O', () => {
    const carried = carriedUnits(swarm, 'balanced', BALANCE_V1);
    expect(carried.queens.eq(20)).toBe(true);
    expect(carried.drones.toNumber()).toBeCloseTo(131.58, 2);
    expect(carried.soldiers.toNumber()).toBeCloseTo(34.21, 2);
    expect(totalAttack(carried, BALANCE_V1).toNumber()).toBeCloseTo(34.21, 2);
  });

  it('nimmt bei „Drohnen zuerst“ 200 Drohnen und keine Soldaten', () => {
    const carried = carriedUnits(swarm, 'drones-first', BALANCE_V1);
    expect(carried.drones.eq(200)).toBe(true);
    expect(carried.soldiers.isZero()).toBe(true);
  });

  it('nimmt bei „Soldaten zuerst“ 100 Soldaten und keine Drohnen', () => {
    const carried = carriedUnits(swarm, 'soldiers-first', BALANCE_V1);
    expect(carried.drones.isZero()).toBe(true);
    expect(carried.soldiers.eq(100)).toBe(true);
  });

  it('füllt den Restplatz mit dem anderen Typ', () => {
    // C = 20, O = 30: Drohnen zuerst 10 + (20 − 10) / 2 = 5 Soldaten; Soldaten zuerst 10 · 2, 0 Drohnen.
    const mixed = units(2, 10, 10);
    const dronesFirst = carriedUnits(mixed, 'drones-first', BALANCE_V1);
    expect(dronesFirst.drones.eq(10)).toBe(true);
    expect(dronesFirst.soldiers.eq(5)).toBe(true);
    const soldiersFirst = carriedUnits(mixed, 'soldiers-first', BALANCE_V1);
    expect(soldiersFirst.soldiers.eq(10)).toBe(true);
    expect(soldiersFirst.drones.isZero()).toBe(true);
  });

  it.each(['balanced', 'drones-first', 'soldiers-first'] as const)(
    'nimmt bei „%s“ alle mit, wenn der Platz reicht (auch O = C)',
    (priority) => {
      const fits = units(2, 16, 2);
      expect(carriedUnits(fits, priority, BALANCE_V1)).toBe(fits);
    },
  );

  it('lässt ohne Königinnen alle Drohnen und Soldaten zurück', () => {
    const carried = carriedUnits(units(0, 5, 3), 'balanced', BALANCE_V1);
    expect(carried.drones.isZero()).toBe(true);
    expect(carried.soldiers.isZero()).toBe(true);
  });

  it('nimmt Einheiten ohne Platzbedarf immer mit', () => {
    const params = { ...BALANCE_V1, droneSpace: 0 };
    const carried = carriedUnits(units(1, 50, 10), 'drones-first', params);
    expect(carried.drones.eq(50)).toBe(true);
    expect(carried.soldiers.eq(5)).toBe(true);
  });
});

describe('Drohnen opfern (Game-Design §4.10)', () => {
  it('rechnet Beispiel 6: 10 Drohnen ergeben 50 Nahrung, Verlust 50 %', () => {
    expect(sacrificeYieldShare(BALANCE_V1)).toBe(0.5);
    expect(sacrificeLossShare(BALANCE_V1)).toBe(0.5);
    expect(sacrificeFood(Num.from(10), BALANCE_V1).eq(50)).toBe(true);
  });

  it('bewertet Bruchteile anteilig', () => {
    expect(sacrificeFood(Num.from(2.5), BALANCE_V1).eq(12.5)).toBe(true);
  });

  it('kappt die Ausbeute bei 1 − v_min', () => {
    const params = { ...BALANCE_V1, sacrificeYield: 2 };
    expect(sacrificeYieldShare(params)).toBe(0.9);
    expect(sacrificeLossShare(params)).toBeCloseTo(0.1, 12);
    expect(sacrificeFood(Num.from(10), params).eq(90)).toBe(true);
  });

  it('kostet beim Start 12 Drohnen je Königin, nach fünf Käufen ≈ 29,86', () => {
    expect(dronesPerQueen(units(0, 0, 0), BALANCE_V1)?.toNumber()).toBeCloseTo(12, 12);
    expect(dronesPerQueen(units(5, 0, 0), BALANCE_V1)?.toNumber()).toBeCloseTo(29.86, 2);
  });

  it('hat ohne positiven Drohnenwert keinen Preis in Drohnen', () => {
    expect(dronesPerQueen(units(0, 0, 0), { ...BALANCE_V1, droneCost: 0 })).toBeNull();
    expect(dronesPerQueen(units(0, 0, 0), { ...BALANCE_V1, sacrificeYield: 0 })).toBeNull();
  });
});

describe('Funde (Game-Design §4.16)', () => {
  it('rechnet die DNA je Fund mit z (Tabelle, u_F = 1)', () => {
    const dna = [0, 1, 5, 10, 20].map((z) => findDna(z, 1, BALANCE_V1).toNumber());
    expect(dna[0]).toBeCloseTo(10.99, 2);
    expect(dna[1]).toBeCloseTo(13.97, 2);
    expect(dna[2]).toBeCloseTo(36.5, 1);
    expect(dna[3]).toBeCloseTo(121, 0);
    expect(dna[4] / 1338).toBeCloseTo(1, 2);
    expect(findDna(27, 1, BALANCE_V1).toNumber() / 7180).toBeCloseTo(1, 2);
  });

  it('rechnet Nahrung, Streuung und Buff-Ablauf', () => {
    expect(findFood(Num.from(20_000), 1, BALANCE_V1).toNumber()).toBeCloseTo(1000, 10);
    expect(findSpreadFactor(0, BALANCE_V1)).toBeCloseTo(0.8, 12);
    expect(findSpreadFactor(0.5, BALANCE_V1)).toBeCloseTo(1, 12);
    expect(buffExpiresAtMs('plankton-bloom', null, 1_000, BALANCE_V1)).toBe(601_000);
    expect(buffExpiresAtMs('plankton-bloom', 5_000, 1_000, BALANCE_V1)).toBe(605_000);
    expect(buffExpiresAtMs('warm-current', 500, 1_000, BALANCE_V1)).toBe(601_000);
  });

  it('leitet die Abbau-Schwellen aus V und G ab', () => {
    const size = Num.from(1000);
    expect([1, 2, 3, 4].map((j) => harvestThresholdStock(size, j, BALANCE_V1).toNumber())).toEqual([
      750, 500, 250, 0,
    ]);
    expect([1, 2, 3, 4].map((j) => harvestThresholdShare(j, BALANCE_V1))).toEqual([
      0.25, 0.5, 0.75, 1,
    ]);
    const reached = (stock: number): number =>
      reachedHarvestThresholds(size, Num.from(stock), BALANCE_V1);
    expect([1000, 751, 750, 500, 0.1, 0].map(reached)).toEqual([0, 0, 1, 2, 3, 4]);
    expect(reachedHarvestThresholds(size, Num.ZERO, { ...BALANCE_V1, findHarvestDraws: 0 })).toBe(
      0,
    );
  });
});
