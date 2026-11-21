import type { SimSample } from '@app/engine/domain/runner-logic';

import { waitShareInRange } from './wait-share-logic';

function sample(timeMs: number, total: number | null): SimSample {
  return {
    timeMs,
    food: 0,
    stock: 0,
    queens: 0,
    drones: 0,
    soldiers: 0,
    foodPerSecond: 0,
    netFoodPerSecond: 0,
    eggsPerMinute: 0,
    nextBuyMs: {
      queens: total,
      drones: total,
      soldiers: total,
      gland: total,
      adaptation: null,
      total,
    },
    dna: 0,
    dnaFromCombat: 0,
    dnaFromFinds: 0,
    dnaSpent: 0,
  };
}

describe('waitShareInRange', () => {
  // Wartet in [0, 10) und [20, 30), nicht in [10, 20).
  const samples = [sample(0, 5), sample(10, 0), sample(20, null), sample(30, 0)];

  it('wertet den ganzen Lauf aus; „nie“ zählt als Warten', () => {
    expect(waitShareInRange(samples, { fromMs: 0, toMs: 30 })).toBeCloseTo(2 / 3);
  });

  it('schneidet angeschnittene Abschnitte zu', () => {
    expect(waitShareInRange(samples, { fromMs: 5, toMs: 15 })).toBeCloseTo(0.5);
    expect(waitShareInRange(samples, { fromMs: 10, toMs: 20 })).toBe(0);
  });

  it('zählt nur die überdeckte Zeit', () => {
    expect(waitShareInRange(samples, { fromMs: 20, toMs: 100 })).toBe(1);
  });

  it('liefert ohne Überdeckung null', () => {
    expect(waitShareInRange(samples, { fromMs: 40, toMs: 50 })).toBeNull();
    expect(waitShareInRange([], { fromMs: 0, toMs: 10 })).toBeNull();
    expect(waitShareInRange(samples, { fromMs: 5, toMs: 5 })).toBeNull();
  });
});
