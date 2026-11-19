import { DEFAULT_STRATEGY, isStrategyId, STRATEGY_IDS } from './auto-move.model';

describe('Strategien', () => {
  it('hält die stabilen IDs fest', () => {
    expect(STRATEGY_IDS).toEqual(['least-resistance', 'balanced', 'battle-hardened']);
    expect(DEFAULT_STRATEGY).toBe('balanced');
  });

  it('erkennt nur bekannte IDs', () => {
    expect(isStrategyId('battle-hardened')).toBe(true);
    expect(isStrategyId('greedy')).toBe(false);
    expect(isStrategyId(null)).toBe(false);
  });
});
