import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { TransportPriority } from './models/transport-priority.model';
import { Units } from './models/units.model';
import { applyTransport, planTransport, setTransportPriority } from './transport-logic';

const initial = createInitialState({ seed: 'idleswarm', now: 1000 });

function units(queens: number, drones: number, soldiers: number): Units {
  return Object.freeze({
    queens: Num.from(queens),
    drones: Num.from(drones),
    soldiers: Num.from(soldiers),
  });
}

function stateWith(swarm: Units, priority: TransportPriority = 'balanced'): GameState {
  return Object.freeze({ ...initial, units: swarm, priority });
}

describe('planTransport (Game-Design §4.9, Beispiel 5)', () => {
  const swarm = units(20, 500, 130);

  it.each<[TransportPriority, number, number, number, number]>([
    ['balanced', 131.58, 34.21, 368.42, 95.79],
    ['drones-first', 200, 0, 300, 130],
    ['soldiers-first', 0, 100, 500, 30],
  ])('teilt bei „%s“ in mitkommend und zurückgelassen', (priority, d, s, leftD, leftS) => {
    const result = planTransport(swarm, priority, DEFAULT_BALANCE);
    expect(result.fitsAll).toBe(false);
    expect(result.carried.queens.eq(20)).toBe(true);
    expect(result.carried.drones.toNumber()).toBeCloseTo(d, 2);
    expect(result.carried.soldiers.toNumber()).toBeCloseTo(s, 2);
    expect(result.leftBehind.queens.isZero()).toBe(true);
    expect(result.leftBehind.drones.toNumber()).toBeCloseTo(leftD, 2);
    expect(result.leftBehind.soldiers.toNumber()).toBeCloseTo(leftS, 2);
  });

  it('lässt niemanden zurück, wenn der Platz reicht', () => {
    const fits = units(1, 6, 2);
    const result = planTransport(fits, 'drones-first', DEFAULT_BALANCE);
    expect(result.fitsAll).toBe(true);
    expect(result.carried).toBe(fits);
    expect(result.leftBehind.drones.isZero()).toBe(true);
    expect(result.leftBehind.soldiers.isZero()).toBe(true);
  });
});

describe('applyTransport', () => {
  it('übernimmt die mitkommenden Einheiten mit der Priorität aus dem Zustand', () => {
    const state = stateWith(units(20, 500, 130), 'soldiers-first');
    const next = applyTransport(state, DEFAULT_BALANCE);
    expect(next.units.queens.eq(20)).toBe(true);
    expect(next.units.drones.isZero()).toBe(true);
    expect(next.units.soldiers.eq(100)).toBe(true);
    expect(next.res).toBe(state.res);
    expect(state.units.drones.eq(500)).toBe(true);
  });

  it('gibt denselben Zustand zurück, wenn alles passt', () => {
    const state = stateWith(units(1, 10, 0));
    expect(applyTransport(state, DEFAULT_BALANCE)).toBe(state);
  });
});

describe('setTransportPriority', () => {
  it('setzt eine gültige Priorität', () => {
    const state = stateWith(units(1, 0, 0), 'balanced');
    const next = setTransportPriority(state, 'drones-first');
    expect(next.priority).toBe('drones-first');
    expect(state.priority).toBe('balanced');
  });

  it('gibt bei unveränderter oder unbekannter Priorität denselben Zustand zurück', () => {
    const state = stateWith(units(1, 0, 0), 'balanced');
    expect(setTransportPriority(state, 'balanced')).toBe(state);
    expect(setTransportPriority(state, 'queens-first' as TransportPriority)).toBe(state);
  });
});
