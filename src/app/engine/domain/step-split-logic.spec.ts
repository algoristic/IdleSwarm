import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';

import { createInitialState } from './game-state-logic';
import { GameState } from './models/game-state.model';
import { nextSplitMs } from './step-split-logic';

describe('nextSplitMs', () => {
  // Abbaurate g_0 + D · r_d = 1 + 1 · 1 = 2 Nahrung/s.
  const params: BalanceParams = { ...DEFAULT_BALANCE, baseFoodRate: 1, droneCollectRate: 1 };
  const NOW_MS = 5_000;

  function swarm(
    change: { stock?: number; enabled?: boolean; threshold?: number } = {},
  ): GameState {
    const base = createInitialState({ seed: 'split', now: 0 }, params);
    return {
      ...base,
      units: { ...base.units, drones: Num.ONE },
      site: { ...base.site, stock: Num.from(change.stock ?? 100), size: Num.from(100) },
      auto: {
        ...base.auto,
        enabled: change.enabled ?? true,
        threshold: change.threshold ?? 0.2,
      },
    };
  }

  function travelling(remainingMs: number): GameState {
    const state = swarm();
    return { ...state, travel: { target: state.map.candidates[0], remainingMs } };
  }

  it('teilt an der Ankunft, aufgerundet auf die nächste ganze Millisekunde', () => {
    expect(nextSplitMs(travelling(2_500.2), NOW_MS, params)).toBe(NOW_MS + 2_501);
  });

  it('teilt an der Ankunft mindestens eine Millisekunde später', () => {
    expect(nextSplitMs(travelling(0), NOW_MS, params)).toBe(NOW_MS + 1);
    expect(nextSplitMs(travelling(0.3), NOW_MS, params)).toBe(NOW_MS + 1);
  });

  it('bevorzugt während der Reise die Ankunft vor dem Auto-Auslöser', () => {
    expect(nextSplitMs(travelling(MS_PER_SECOND), NOW_MS, params)).toBe(NOW_MS + MS_PER_SECOND);
  });

  it('teilt am vorhergesagten Auto-Auslöser V = θ · G', () => {
    // (100 − 0,2 · 100) / 2 = 40 s
    expect(nextSplitMs(swarm(), NOW_MS, params)).toBe(NOW_MS + 40 * MS_PER_SECOND);
    // (20,0013 − 20) / 2 = 0,65 ms, auf 1 ms aufgerundet
    expect(nextSplitMs(swarm({ stock: 20.0013 }), NOW_MS, params)).toBe(NOW_MS + 1);
  });

  it('teilt nicht ohne Auto-Weiterziehen', () => {
    expect(nextSplitMs(swarm({ enabled: false }), NOW_MS, params)).toBe(Infinity);
  });

  it('teilt nicht, wenn der Auslöser schon erreicht ist', () => {
    expect(nextSplitMs(swarm({ stock: 20 }), NOW_MS, params)).toBe(Infinity);
    expect(nextSplitMs(swarm({ stock: 10 }), NOW_MS, params)).toBe(Infinity);
  });

  it('teilt nicht ohne Abbaurate', () => {
    const idle = { ...params, baseFoodRate: 0 };
    const state = { ...swarm(), units: { ...swarm().units, drones: Num.ZERO } };
    expect(nextSplitMs(state, NOW_MS, idle)).toBe(Infinity);
  });
});
