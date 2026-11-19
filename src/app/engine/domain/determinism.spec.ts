import { DEFAULT_BALANCE, TICK_MS } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';
import { nextRandom } from '@app/shared/util/rng/rng';
import { UNIT_TYPES } from '@app/swarm/domain/models/units.model';

import { apply, applyCommand } from './commands-logic';
import { createInitialState } from './game-state-logic';
import { GameEvent } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { drawRandom } from './random-logic';
import { step } from './step-logic';

const NOW = 1_700_000_000_000;

/** Feste Abfolge aus Kommandos, Käufen, Ticks und RNG-Ziehungen. */
function play(seed: string): { json: string; values: number[]; state: GameState } {
  // Genug Startnahrung, damit auch Königinnen und Soldaten gekauft werden.
  let state = createInitialState({ seed, now: NOW }, { ...DEFAULT_BALANCE, startFood: 1000 });
  const values: number[] = [];
  for (let i = 0; i < 1000; i++) {
    state = apply(state, i % 2 === 0 ? { type: 'noop' } : { type: 'depart', target: i % 6 });
    if (i % 5 === 0) {
      state = apply(state, { type: 'buy', unit: UNIT_TYPES[i % UNIT_TYPES.length] });
    }
    state = step(state, TICK_MS).state;
    if (i % 3 === 0) {
      const result = drawRandom(state);
      values.push(result.value);
      state = result.state;
    }
  }
  return { json: JSON.stringify(state), values, state };
}

/**
 * Kleine Futterstellen, Auto-Weiterziehen und gelegentliche manuelle Aufbrüche: Aufbruch, Reise,
 * Ankunft mit neuen Kandidaten aus dem RNG und Auto-Auslöser wechseln sich ab.
 */
function travelAndAuto(seed: string): { json: string; events: string; types: GameEvent['type'][] } {
  const params = { ...DEFAULT_BALANCE, siteSize: 30, startFood: 500 };
  const base = createInitialState({ seed, now: NOW }, params);
  let state: GameState = {
    ...base,
    units: { ...base.units, drones: Num.from(10), soldiers: Num.from(5) },
  };
  state = apply(state, { type: 'setAutoMove', enabled: true }, params);
  const events: GameEvent[] = [];
  for (let i = 0; i < 6000; i++) {
    if (i % 997 === 0) {
      const result = applyCommand(state, { type: 'depart', target: i % 6 }, params);
      events.push(...result.events);
      state = result.state;
    }
    if (i === 2500) {
      state = apply(
        state,
        { type: 'setAutoMove', strategy: 'least-resistance', threshold: 0.2 },
        params,
      );
    }
    const result = step(state, TICK_MS, params);
    events.push(...result.events);
    state = result.state;
  }
  return {
    json: JSON.stringify(state),
    events: JSON.stringify(events),
    types: events.map((event) => event.type),
  };
}

describe('Determinismus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('liefert bei gleichem Seed und gleicher Abfolge denselben Zustand', () => {
    const first = play('idleswarm');
    const second = play('idleswarm');
    expect(second.json).toBe(first.json);
    expect(second.values).toEqual(first.values);
  });

  it('enthält in der Abfolge Käufe jedes Einheitentyps', () => {
    const { bought } = play('idleswarm').state;
    for (const unit of UNIT_TYPES) {
      expect(bought[unit].gt(0)).toBe(true);
    }
  });

  it('bleibt über Aufbruch, Reise, Ankunft und Auto-Weiterziehen gleich', () => {
    const first = travelAndAuto('idleswarm');
    expect(first.types.filter((type) => type === 'arrived').length).toBeGreaterThan(3);
    expect(first.types).toContain('siteDepleted');
    const departures = JSON.parse(first.events).filter(
      (event: { type: string }) => event.type === 'departed',
    );
    expect(departures.some((event: { auto: boolean }) => event.auto)).toBe(true);
    expect(departures.some((event: { auto: boolean }) => !event.auto)).toBe(true);
    expect(travelAndAuto('idleswarm')).toEqual(first);
    expect(travelAndAuto('ameisenhaufen').json).not.toBe(first.json);
  });

  it('liefert bei anderem Seed einen anderen Verlauf', () => {
    const first = play('idleswarm');
    const other = play('ameisenhaufen');
    expect(other.json).not.toBe(first.json);
    expect(other.values).not.toEqual(first.values);
  });

  it('hängt nicht von Uhr oder globalem Zufall ab', () => {
    const expected = play('idleswarm');
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const clock = vi.spyOn(Date, 'now').mockReturnValue(0);

    expect(play('idleswarm').json).toBe(expected.json);
    nextRandom(1);
    expect(random).not.toHaveBeenCalled();
    expect(clock).not.toHaveBeenCalled();
  });
});
