import type { UnitType } from '../data/units';
import { Num } from '../num/num';
import type { Units } from '../state/game-state';
import { DEFAULT_BALANCE } from './constants';
import {
  broodResult,
  clickGain,
  eggsPerMinute,
  isSpaceWarning,
  meanBroodCost,
  nextQueenEffect,
  spaceAvailable,
  spaceUsage,
  spaceUsed,
  totalAttack,
  unitPrice,
} from './formulas';

function units(queens: number, drones: number, soldiers: number): Units {
  return Object.freeze({
    queens: Num.from(queens),
    drones: Num.from(drones),
    soldiers: Num.from(soldiers),
  });
}

describe('clickGain', () => {
  it('liefert den Klickertrag bei ausreichendem Vorrat', () => {
    expect(clickGain(Num.from(20000), DEFAULT_BALANCE).eq(1)).toBe(true);
  });

  it('begrenzt den Ertrag auf den Vorrat', () => {
    expect(clickGain(Num.from(0.25), DEFAULT_BALANCE).eq(0.25)).toBe(true);
    expect(clickGain(Num.ZERO, DEFAULT_BALANCE).isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    expect(clickGain(Num.from(100), { ...DEFAULT_BALANCE, clickYield: 3 }).eq(3)).toBe(true);
  });
});

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
    expect(unitPrice('drones', bought, DEFAULT_BALANCE).toNumber()).toBeCloseTo(drones, 2);
    expect(unitPrice('soldiers', bought, DEFAULT_BALANCE).toNumber()).toBeCloseTo(soldiers, 2);
    expect(unitPrice('queens', bought, DEFAULT_BALANCE).toNumber()).toBeCloseTo(queens, 2);
  });

  it('rechnet ungerundet', () => {
    expect(unitPrice('drones', units(0, 5, 0), DEFAULT_BALANCE).toNumber()).toBeCloseTo(
      14.0255173,
      6,
    );
  });

  it('zählt nur den Kaufzähler des eigenen Typs', () => {
    expect(unitPrice('drones', units(9, 0, 9), DEFAULT_BALANCE).eq(10)).toBe(true);
    expect(unitPrice('soldiers', units(9, 9, 0), DEFAULT_BALANCE).eq(25)).toBe(true);
    expect(unitPrice('queens', units(0, 9, 9), DEFAULT_BALANCE).eq(60)).toBe(true);
  });

  it.each<[UnitType, Partial<typeof DEFAULT_BALANCE>, number]>([
    ['drones', { droneCost: 100, droneCostGrowth: 2 }, 400],
    ['soldiers', { soldierCost: 3, soldierCostGrowth: 3 }, 27],
    ['queens', { queenCost: 5, queenCostGrowth: 10 }, 500],
  ])('nutzt überschriebene Parameter für %s', (type, override, expected) => {
    const params = { ...DEFAULT_BALANCE, ...override };
    expect(unitPrice(type, units(2, 2, 2), params).eq(expected)).toBe(true);
  });
});

describe('eggsPerMinute', () => {
  it('rechnet Königinnen mal Eier je Königin', () => {
    expect(eggsPerMinute(units(3, 7, 7), DEFAULT_BALANCE).eq(18)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...DEFAULT_BALANCE, queenEggsPerMin: 2.5 };
    expect(eggsPerMinute(units(2, 0, 0), params).eq(5)).toBe(true);
  });
});

describe('meanBroodCost', () => {
  it('liefert 13,75 mit den Startwerten', () => {
    expect(meanBroodCost(DEFAULT_BALANCE)).toBe(13.75);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...DEFAULT_BALANCE, broodDroneShare: 0.5, droneCost: 2, soldierCost: 4 };
    expect(meanBroodCost(params)).toBe(3);
  });
});

describe('broodResult', () => {
  it('brütet bei genug Nahrung alle Eier des Schritts aus', () => {
    const brood = broodResult(units(1, 10, 0), Num.from(5.2), 100, DEFAULT_BALANCE);
    expect(brood.hatched.eq(0.01)).toBe(true);
    expect(brood.drones.eq(0.0075)).toBe(true);
    expect(brood.soldiers.eq(0.0025)).toBe(true);
    expect(brood.foodCost.eq(0.1375)).toBe(true);
  });

  it('begrenzt die Brut auf die vorhandene Nahrung', () => {
    const food = Num.from(0.05);
    const brood = broodResult(units(1, 0, 0), food, 100, DEFAULT_BALANCE);
    expect(brood.hatched.toNumber()).toBeCloseTo(0.05 / 13.75, 12);
    expect(brood.foodCost.eq(food)).toBe(true);
  });

  it('verbraucht genau passende Nahrung vollständig', () => {
    const food = Num.from(0.1375);
    const brood = broodResult(units(1, 0, 0), food, 100, DEFAULT_BALANCE);
    expect(brood.hatched.eq(0.01)).toBe(true);
    expect(brood.foodCost.eq(food)).toBe(true);
  });

  it.each([
    ['ohne Königinnen', 0, 10, 100],
    ['ohne Nahrung', 1, 0, 100],
    ['ohne Zeit', 1, 10, 0],
  ])('brütet %s nichts aus', (_name, queens, food, dtMs) => {
    const brood = broodResult(units(queens, 0, 0), Num.from(food), dtMs, DEFAULT_BALANCE);
    expect(brood.hatched.isZero()).toBe(true);
    expect(brood.drones.isZero()).toBe(true);
    expect(brood.soldiers.isZero()).toBe(true);
    expect(brood.foodCost.isZero()).toBe(true);
  });

  it('wird bei Kosten von 0 nicht durch Nahrung begrenzt', () => {
    const params = { ...DEFAULT_BALANCE, droneCost: 0, soldierCost: 0 };
    const brood = broodResult(units(1, 0, 0), Num.ZERO, 1000, params);
    expect(brood.hatched.eq(0.1)).toBe(true);
    expect(brood.foodCost.isZero()).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = {
      ...DEFAULT_BALANCE,
      queenEggsPerMin: 60,
      broodDroneShare: 0.5,
      droneCost: 2,
      soldierCost: 4,
    };
    const brood = broodResult(units(2, 0, 0), Num.from(100), 1000, params);
    expect(brood.hatched.eq(2)).toBe(true);
    expect(brood.drones.eq(1)).toBe(true);
    expect(brood.soldiers.eq(1)).toBe(true);
    expect(brood.foodCost.eq(6)).toBe(true);
  });
});

describe('totalAttack', () => {
  it('rechnet Soldaten mal Angriff je Soldat', () => {
    expect(totalAttack(units(1, 9, 4), DEFAULT_BALANCE).eq(4)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    expect(totalAttack(units(1, 0, 4), { ...DEFAULT_BALANCE, soldierAttack: 3 }).eq(12)).toBe(true);
  });
});

describe('Platz', () => {
  it('rechnet das Beispiel aus Game-Design §4.5', () => {
    const swarm = units(2, 15, 3);
    expect(spaceUsed(swarm, DEFAULT_BALANCE).eq(21)).toBe(true);
    expect(spaceAvailable(swarm, DEFAULT_BALANCE).eq(20)).toBe(true);
    expect(spaceUsage(swarm, DEFAULT_BALANCE)?.eq(1.05)).toBe(true);
    expect(isSpaceWarning(swarm, DEFAULT_BALANCE)).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const params = { ...DEFAULT_BALANCE, queenSpace: 4, droneSpace: 2, soldierSpace: 5 };
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
    expect(isSpaceWarning(units(2, drones, 0), DEFAULT_BALANCE)).toBe(expected);
  });

  it('warnt bei leerem Schwarm mit Königin nicht', () => {
    expect(isSpaceWarning(units(1, 0, 0), DEFAULT_BALANCE)).toBe(false);
    expect(spaceUsage(units(1, 0, 0), DEFAULT_BALANCE)?.isZero()).toBe(true);
  });

  it.each([
    [0, 0],
    [5, 1],
  ])('behandelt 0 verfügbaren Platz bei %d Drohnen, %d Soldaten', (drones, soldiers) => {
    const swarm = units(0, drones, soldiers);
    expect(spaceAvailable(swarm, DEFAULT_BALANCE).isZero()).toBe(true);
    expect(spaceUsage(swarm, DEFAULT_BALANCE)).toBeNull();
    expect(isSpaceWarning(swarm, DEFAULT_BALANCE)).toBe(true);
  });
});

describe('nextQueenEffect', () => {
  it('liefert Eier/min und Platz einer Königin', () => {
    const effect = nextQueenEffect(DEFAULT_BALANCE);
    expect(effect.eggsPerMin.eq(6)).toBe(true);
    expect(effect.space.eq(10)).toBe(true);
  });

  it('entspricht der Differenz nach einer weiteren Königin', () => {
    const effect = nextQueenEffect(DEFAULT_BALANCE);
    const before = units(2, 0, 0);
    const after = units(3, 0, 0);
    expect(
      eggsPerMinute(after, DEFAULT_BALANCE)
        .sub(eggsPerMinute(before, DEFAULT_BALANCE))
        .eq(effect.eggsPerMin),
    ).toBe(true);
    expect(
      spaceAvailable(after, DEFAULT_BALANCE)
        .sub(spaceAvailable(before, DEFAULT_BALANCE))
        .eq(effect.space),
    ).toBe(true);
  });

  it('nutzt überschriebene Parameter', () => {
    const effect = nextQueenEffect({ ...DEFAULT_BALANCE, queenEggsPerMin: 9, queenSpace: 3 });
    expect(effect.eggsPerMin.eq(9)).toBe(true);
    expect(effect.space.eq(3)).toBe(true);
  });
});
