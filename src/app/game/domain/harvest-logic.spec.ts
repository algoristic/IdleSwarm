import { foodFillPercent, harvestThrottlePercent } from './harvest-logic';

describe('harvestThrottlePercent', () => {
  it('has no value up to the capacity', () => {
    expect(harvestThrottlePercent(1000, 2000)).toBeNull();
    expect(harvestThrottlePercent(2000, 2000)).toBeNull();
  });

  it('is the rounded share above the capacity', () => {
    expect(harvestThrottlePercent(4000, 2000)).toBe(50);
    expect(harvestThrottlePercent(3000, 2000)).toBe(33);
  });

  it('is at least one percent just above the capacity', () => {
    expect(harvestThrottlePercent(2001, 2000)).toBe(1);
  });
});

describe('foodFillPercent', () => {
  it('is the share of the capacity, at most 100', () => {
    expect(foodFillPercent(500, 2000)).toBe(25);
    expect(foodFillPercent(3000, 2000)).toBe(100);
  });
});
