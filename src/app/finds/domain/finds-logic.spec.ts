import { seedToRngState } from '@app/shared/util/rng/rng';

import { findsRngState, initialFinds } from './finds-logic';

describe('findsRngState', () => {
  it('ist für denselben Seed stabil', () => {
    expect(findsRngState('idleswarm')).toBe(findsRngState('idleswarm'));
  });

  it('weicht vom RNG-Zustand des Generators ab', () => {
    expect(findsRngState('idleswarm')).not.toBe(seedToRngState('idleswarm'));
    expect(findsRngState('idleswarm')).not.toBe(findsRngState('andere'));
  });

  it('ist ein uint32', () => {
    const state = findsRngState('');
    expect(Number.isInteger(state)).toBe(true);
    expect(state).toBeGreaterThanOrEqual(0);
    expect(state).toBeLessThan(2 ** 32);
  });
});

describe('initialFinds', () => {
  it('beginnt ohne Funde, mit dem Fund-RNG aus dem Seed', () => {
    expect(initialFinds('idleswarm')).toEqual({
      rngState: findsRngState('idleswarm'),
      total: 0,
      collected: {},
      buffs: [],
    });
  });
});
