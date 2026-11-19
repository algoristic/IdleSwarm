import type { SimSample } from '@app/engine/domain/runner-logic';

import { dnaFlow, dnaSinkExhaustedMs } from './dna-flow-logic';

function sample(timeMs: number, combat: number, finds: number, spent: number): SimSample {
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
    nextBuyMs: { queens: null, drones: null, soldiers: null, total: null },
    dna: combat + finds - spent,
    dnaFromCombat: combat,
    dnaFromFinds: finds,
    dnaSpent: spent,
  };
}

describe('dnaFlow', () => {
  const samples = [sample(0, 0, 0, 0), sample(10, 5, 20, 8), sample(20, 5, 120, 100)];

  it('stellt Einnahmen gegen Ausgaben und offenes Genom', () => {
    expect(dnaFlow(samples, 100)).toEqual([
      { timeMs: 0, dna: 0, fromCombat: 0, fromFinds: 0, income: 0, spent: 0, openGenomeCost: 100 },
      {
        timeMs: 10,
        dna: 17,
        fromCombat: 5,
        fromFinds: 20,
        income: 25,
        spent: 8,
        openGenomeCost: 92,
      },
      {
        timeMs: 20,
        dna: 25,
        fromCombat: 5,
        fromFinds: 120,
        income: 125,
        spent: 100,
        openGenomeCost: 0,
      },
    ]);
  });

  it('meldet, ab wann die Einnahmen das ganze Genom übersteigen', () => {
    expect(dnaSinkExhaustedMs(samples, 100)).toBe(20);
    expect(dnaSinkExhaustedMs(samples, 1000)).toBeNull();
  });
});
