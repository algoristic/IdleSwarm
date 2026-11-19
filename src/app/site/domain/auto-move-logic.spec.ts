import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { applyAutoMove, isAutoMoveDue, setAutoMove } from './auto-move-logic';
import { AutoMove, StrategyId } from './models/auto-move.model';
import { SiteCandidate } from './models/map.model';

const initial = createInitialState({ seed: 'auto', now: 0 });

const CANDIDATES: readonly SiteCandidate[] = [
  { type: 'vent', position: { x: 3, y: 0 }, size: Num.from(30_240), defense: Num.from(26) },
  { type: 'algal-mat', position: { x: -2, y: 0 }, size: Num.from(16_940), defense: Num.ZERO },
  { type: 'vent', position: { x: 0, y: -1 }, size: Num.from(28_000), defense: Num.from(20) },
];

function stateWith(stock: number, auto: Partial<AutoMove> = {}): GameState {
  const state: GameState = {
    ...initial,
    units: { queens: Num.from(7), drones: Num.ZERO, soldiers: Num.from(34) },
    site: { type: 'vent', size: Num.from(1000), stock: Num.from(stock) },
    map: { ...initial.map, candidates: CANDIDATES },
    auto: { enabled: true, strategy: 'balanced', threshold: 0, ...auto },
  };
  return Object.freeze(state);
}

describe('setAutoMove', () => {
  const state = Object.freeze(initial);

  it('schaltet ein und ändert Strategie und Schwelle', () => {
    const next = setAutoMove(
      state,
      { enabled: true, strategy: 'battle-hardened', threshold: 0.3 },
      DEFAULT_BALANCE,
    );
    expect(next.auto).toEqual({ enabled: true, strategy: 'battle-hardened', threshold: 0.3 });
    expect(state.auto).toEqual({ enabled: false, strategy: 'balanced', threshold: 0 });
  });

  it('lässt fehlende Felder unverändert', () => {
    const next = setAutoMove(state, { threshold: 0.5 }, DEFAULT_BALANCE);
    expect(next.auto).toEqual({ enabled: false, strategy: 'balanced', threshold: 0.5 });
  });

  it.each([
    [1.5, 0.9],
    [Infinity, 0.9],
    [-0.2, 0],
    [-Infinity, 0],
  ])('begrenzt die Schwelle %d auf %d', (threshold, expected) => {
    expect(setAutoMove(state, { threshold }, DEFAULT_BALANCE).auto.threshold).toBe(expected);
  });

  it.each<Partial<AutoMove>>([
    { threshold: Number.NaN },
    { threshold: '0.5' as unknown as number },
    { strategy: 'greedy' as StrategyId },
    { enabled: 'yes' as unknown as boolean },
    { enabled: true, threshold: Number.NaN },
  ])('bleibt bei ungültigen Werten ohne Wirkung (%o)', (settings) => {
    expect(setAutoMove(state, settings, DEFAULT_BALANCE)).toBe(state);
  });

  it('gibt ohne Änderung dieselbe Referenz zurück', () => {
    expect(setAutoMove(state, {}, DEFAULT_BALANCE)).toBe(state);
    expect(setAutoMove(state, { enabled: false, threshold: -1 }, DEFAULT_BALANCE)).toBe(state);
  });
});

describe('isAutoMoveDue und applyAutoMove (Game-Design §4.12)', () => {
  it('löst mit Schwelle 0 erst bei leerem Vorrat aus', () => {
    expect(isAutoMoveDue(stateWith(0.001), DEFAULT_BALANCE)).toBe(false);
    expect(isAutoMoveDue(stateWith(0), DEFAULT_BALANCE)).toBe(true);
  });

  it('löst mit Schwelle 0,5 bei V ≤ θ · G aus', () => {
    expect(isAutoMoveDue(stateWith(500.001, { threshold: 0.5 }), DEFAULT_BALANCE)).toBe(false);
    expect(isAutoMoveDue(stateWith(500, { threshold: 0.5 }), DEFAULT_BALANCE)).toBe(true);
  });

  it('wendet eine geladene Schwelle über θ_max höchstens mit θ_max an', () => {
    // Die Ladeprüfung lässt [0; 1] zu; gespeichert bleibt 0,9.
    const params = { ...DEFAULT_BALANCE, maxAutoThreshold: 0.5 };
    expect(isAutoMoveDue(stateWith(600, { threshold: 0.9 }), params)).toBe(false);
    expect(isAutoMoveDue(stateWith(500, { threshold: 0.9 }), params)).toBe(true);
    const input = stateWith(600, { threshold: 0.9 });
    expect(applyAutoMove(input, params).state).toBe(input);
    expect(input.auto.threshold).toBe(0.9);
  });

  it('löst ausgeschaltet und während einer Reise nicht aus', () => {
    expect(isAutoMoveDue(stateWith(0, { enabled: false }), DEFAULT_BALANCE)).toBe(false);
    const traveling = { ...stateWith(0), travel: { target: CANDIDATES[1], remainingMs: 1 } };
    expect(isAutoMoveDue(traveling, DEFAULT_BALANCE)).toBe(false);
  });

  it('bricht zum Ziel der Strategie auf und meldet auto: true', () => {
    const input = stateWith(400, { threshold: 0.5, strategy: 'battle-hardened' });
    const { state, events } = applyAutoMove(input, DEFAULT_BALANCE);
    expect(state.travel?.target).toBe(CANDIDATES[0]);
    expect(state.site.stock).toBe(Num.ZERO);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'departed', siteType: 'vent', auto: true });
    const [event] = events;
    expect(event.type === 'departed' && event.forfeitedStock.eq(400)).toBe(true);
  });

  it('wählt mit „Ausgewogen“ K4', () => {
    const { state } = applyAutoMove(stateWith(0), DEFAULT_BALANCE);
    expect(state.travel?.target).toBe(CANDIDATES[2]);
  });

  it('bleibt ohne Auslöser oder ohne Ziel ohne Wirkung', () => {
    const notDue = stateWith(1);
    expect(applyAutoMove(notDue, DEFAULT_BALANCE)).toEqual({ state: notDue, events: [] });
    const off = stateWith(0, { enabled: false });
    expect(applyAutoMove(off, DEFAULT_BALANCE).state).toBe(off);
    const noTarget = Object.freeze({
      ...stateWith(0),
      map: { ...initial.map, candidates: [CANDIDATES[0]] },
      units: { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.ZERO },
    });
    expect(applyAutoMove(noTarget, DEFAULT_BALANCE)).toEqual({ state: noTarget, events: [] });
  });
});
