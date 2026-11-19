import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { combineEffects } from '@app/balance/domain/effects-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

import { SiteTypeId } from './data/sites-era1.data';
import { generateCandidates } from './generator-logic';
import { ROUTE_MAX_POINTS, RoutePoint, SiteCandidate } from './models/map.model';
import { arrive, canDepart, depart, departureBlocker } from './move-logic';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function candidate(
  type: SiteTypeId,
  x: number,
  y: number,
  size: number,
  defense: number,
): SiteCandidate {
  return { type, position: { x, y }, size: Num.from(size), defense: Num.from(defense) };
}

/** Kandidaten aus Game-Design §4.6, Beispiel 3, mit den Distanzen der Tabelle um `(0, 0)`. */
const EXAMPLE_3: readonly SiteCandidate[] = [
  candidate('vent', 3, 0, 30_240, 26),
  candidate('bacterial-mat', 0, 3, 55_440, 52),
  candidate('algal-mat', -2, 0, 16_940, 0),
  candidate('vent', 0, -1, 28_000, 20),
  candidate('whale-fall', 5.8, 0, 124_320, 103),
  candidate('methane-seep', 0, 6.5, 108_500, 73),
];

const initial = createInitialState({ seed: 'weiterziehen', now: 1000 });

interface Setup {
  readonly queens?: number;
  readonly drones?: number;
  readonly soldiers?: number;
  readonly stock?: number;
  readonly priority?: TransportPriority;
}

function stateWith({
  queens = 7,
  drones = 0,
  soldiers = 34,
  stock = 1234.5,
  priority = 'balanced',
}: Setup = {}): GameState {
  return deepFreeze({
    ...initial,
    time: { ...initial.time, played: 60_000 },
    units: { queens: Num.from(queens), drones: Num.from(drones), soldiers: Num.from(soldiers) },
    site: { ...initial.site, stock: Num.from(stock) },
    map: { ...initial.map, candidates: EXAMPLE_3 },
    priority,
  });
}

describe('departureBlocker und canDepart (Game-Design §4.11)', () => {
  it('erlaubt einnehmbare Ziele in Reichweite', () => {
    const state = stateWith();
    expect([0, 1, 2, 3, 4, 5].map((i) => departureBlocker(state, i, DEFAULT_BALANCE))).toEqual([
      null,
      'too-strong',
      null,
      null,
      'out-of-range',
      'out-of-range',
    ]);
    expect(canDepart(state, 0, DEFAULT_BALANCE)).toBe(true);
    expect(canDepart(state, 1, DEFAULT_BALANCE)).toBe(false);
  });

  it.each([-1, 6, 1.5, Number.NaN, Infinity])('weist den Index %d als unbekannt ab', (index) => {
    expect(departureBlocker(stateWith(), index, DEFAULT_BALANCE)).toBe('unknown-target');
  });

  it('weist jeden Aufbruch während einer Reise ab', () => {
    const state = deepFreeze({
      ...stateWith(),
      travel: { target: EXAMPLE_3[2], remainingMs: 5000 },
    });
    expect(departureBlocker(state, 2, DEFAULT_BALANCE)).toBe('traveling');
  });

  it('beurteilt die Einnehmbarkeit mit den mitkommenden Soldaten', () => {
    // Beispiel 5 aus §4.9: „Drohnen zuerst“ nimmt keine Soldaten mit, nur die Algenmatte bleibt.
    const state = stateWith({ queens: 20, drones: 500, soldiers: 130, priority: 'drones-first' });
    expect(departureBlocker(state, 0, DEFAULT_BALANCE)).toBe('too-strong');
    expect(departureBlocker(state, 2, DEFAULT_BALANCE)).toBeNull();
  });
});

describe('depart', () => {
  it('bricht zu K1 auf: Restvorrat verfällt, Reise mit d · t_r', () => {
    const input = stateWith();
    const { state, events } = depart(input, 0, false, DEFAULT_BALANCE);
    expect(state.site.stock).toBe(Num.ZERO);
    expect(state.site.type).toBe(input.site.type);
    expect(state.travel).toEqual({ target: EXAMPLE_3[0], remainingMs: 30_000 });
    expect(state.units).toBe(input.units);
    expect(state.map).toBe(input.map);
    expect(state.res).toBe(input.res);
    expect(state.rngState).toBe(input.rngState);
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event).toMatchObject({
      type: 'departed',
      playedMs: 60_000,
      siteType: 'vent',
      distance: 3,
      auto: false,
    });
    if (event.type !== 'departed') {
      throw new Error('departed erwartet');
    }
    expect(event.forfeitedStock.eq(1234.5)).toBe(true);
    expect(event.leftBehind.drones.isZero()).toBe(true);
    expect(event.leftBehind.soldiers.isZero()).toBe(true);
  });

  it('wendet den Transport an und meldet die Zurückgelassenen (Beispiel 5, ausgewogen)', () => {
    const input = stateWith({ queens: 20, drones: 500, soldiers: 130 });
    const { state, events } = depart(input, 0, true, DEFAULT_BALANCE);
    expect(state.units.queens.eq(20)).toBe(true);
    expect(state.units.drones.toNumber()).toBeCloseTo(131.58, 2);
    expect(state.units.soldiers.toNumber()).toBeCloseTo(34.21, 2);
    const [event] = events;
    if (event?.type !== 'departed') {
      throw new Error('departed erwartet');
    }
    expect(event.auto).toBe(true);
    expect(event.leftBehind.drones.toNumber()).toBeCloseTo(368.42, 2);
    expect(event.leftBehind.soldiers.toNumber()).toBeCloseTo(95.79, 2);
  });

  it('meldet bei leerem Vorrat einen verfallenen Vorrat von 0', () => {
    const { events } = depart(stateWith({ stock: 0 }), 2, false, DEFAULT_BALANCE);
    const [event] = events;
    expect(event?.type === 'departed' && event.forfeitedStock.isZero()).toBe(true);
  });

  it.each([1, 4, 5, -1, 6])('lässt den Zustand beim Ziel %d unverändert und ohne Ereignis', (i) => {
    const input = stateWith();
    const result = depart(input, i, false, DEFAULT_BALANCE);
    expect(result.state).toBe(input);
    expect(result.events).toEqual([]);
  });

  it('bricht während einer Reise nicht erneut auf', () => {
    const traveling = depart(stateWith(), 0, false, DEFAULT_BALANCE).state;
    const result = depart(traveling, 2, false, DEFAULT_BALANCE);
    expect(result.state).toBe(traveling);
    expect(result.events).toEqual([]);
  });
});

describe('arrive (Game-Design §4.11)', () => {
  function traveling(setup: Setup = {}): GameState {
    return deepFreeze(depart(stateWith(setup), 0, false, DEFAULT_BALANCE).state);
  }

  it('nimmt K1 mit S = 34 ein (Beispiel 4) und wird zum Schlot mit vollem Vorrat', () => {
    const input = traveling();
    const { state, events } = arrive(input, DEFAULT_BALANCE);
    expect(state.units.soldiers.toNumber()).toBeCloseTo(24.06, 2);
    expect(state.units.queens).toBe(input.units.queens);
    expect(state.res.dna.toNumber()).toBeCloseTo(13.55, 2);
    expect(state.res.food).toBe(input.res.food);
    expect(state.bought).toBe(input.bought);
    expect(state.site).toEqual({ type: 'vent', size: Num.from(30_240), stock: Num.from(30_240) });
    expect(state.map.position).toEqual({ x: 3, y: 0 });
    expect(state.map.moves).toBe(1);
    expect(state.map.route).toEqual([
      ...input.map.route,
      { type: 'vent', position: { x: 3, y: 0 } },
    ]);
    expect(state.travel).toBeNull();
    expect(state.auto).toBe(input.auto);
    expect(state.priority).toBe(input.priority);
    expect(events).toHaveLength(1);
    const [event] = events;
    if (event.type !== 'arrived') {
      throw new Error('arrived erwartet');
    }
    expect(event.playedMs).toBe(60_000);
    expect(event.siteType).toBe('vent');
    expect(event.losses.toNumber()).toBeCloseTo(9.94, 2);
    expect(event.dna.toNumber()).toBeCloseTo(13.55, 2);
  });

  it('erzeugt die Kandidaten um die neue Position mit z = 1 und schreibt den RNG fort', () => {
    const input = traveling();
    const { state } = arrive(input, DEFAULT_BALANCE);
    const expected = generateCandidates(
      { origin: { x: 3, y: 0 }, moves: 1, range: 5, rngState: input.rngState },
      DEFAULT_BALANCE,
    );
    expect(state.map.candidates).toEqual(expected.candidates);
    expect(state.rngState).toBe(expected.rngState);
    expect(state.rngState).not.toBe(input.rngState);
    expect(JSON.stringify(arrive(input, DEFAULT_BALANCE))).toBe(
      JSON.stringify(arrive(input, DEFAULT_BALANCE)),
    );
  });

  it('kostet an einer Futterstelle ohne Abwehr nichts und bringt keine DNA', () => {
    const input = deepFreeze(depart(stateWith(), 2, false, DEFAULT_BALANCE).state);
    const { state, events } = arrive(input, DEFAULT_BALANCE);
    expect(state.units).toBe(input.units);
    expect(state.res).toBe(input.res);
    expect(state.site.type).toBe('algal-mat');
    const [event] = events;
    expect(event.type === 'arrived' && event.losses.isZero() && event.dna.isZero()).toBe(true);
  });

  it(`kürzt die Route auf die letzten ${ROUTE_MAX_POINTS} Punkte`, () => {
    const base = traveling();
    const route: RoutePoint[] = Array.from({ length: ROUTE_MAX_POINTS }, (_v, i) => ({
      type: 'vent',
      position: { x: i, y: 0 },
    }));
    const input = deepFreeze({ ...base, map: { ...base.map, route } });
    const { state } = arrive(input, DEFAULT_BALANCE);
    expect(state.map.route).toHaveLength(ROUTE_MAX_POINTS);
    expect(state.map.route[0]).toEqual(route[1]);
    expect(state.map.route.at(-1)).toEqual({ type: 'vent', position: { x: 3, y: 0 } });
  });

  it('lässt den Zustand ohne Reise unverändert', () => {
    const input = stateWith();
    expect(arrive(input, DEFAULT_BALANCE)).toEqual({ state: input, events: [] });
    expect(arrive(input, DEFAULT_BALANCE).state).toBe(input);
  });

  it('verliert nie mehr Soldaten, als da sind', () => {
    const params = { ...DEFAULT_BALANCE, lossFactor: 2 };
    const input = deepFreeze(depart(stateWith(), 0, false, params).state);
    const { state, events } = arrive(input, params);
    expect(state.units.soldiers.gte(0)).toBe(true);
    const [event] = events;
    expect(event.type === 'arrived' && event.losses.lte(34)).toBe(true);
  });
});

describe('arrive mit Effekten (Game-Design §4.13, Beispiel 10)', () => {
  const modifiers = combineEffects(
    [
      { target: 'attackPerSoldier', op: 'add', value: 0.2 },
      { target: 'fallenRecycling', op: 'unlock' },
      { target: 'combatLoss', op: 'mul', value: 0.75 },
    ],
    null,
  );

  it('kämpft mit a_s* und M_verlust und gibt Nahrung aus Gefallenen zurück', () => {
    const input = deepFreeze(depart(stateWith(), 0, false, DEFAULT_BALANCE).state);
    const { state, events } = arrive(input, DEFAULT_BALANCE, modifiers);
    expect(state.units.soldiers.toNumber()).toBeCloseTo(34 - 5.18, 2);
    expect(state.res.food.sub(input.res.food).toNumber()).toBeCloseTo(64.7, 1);
    expect(state.res.dna.toNumber()).toBeCloseTo(13.55, 2);
    const [event] = events;
    if (event.type !== 'arrived') {
      throw new Error('arrived erwartet');
    }
    expect(event.losses.toNumber()).toBeCloseTo(5.18, 2);
  });

  it('gibt ohne Autophagie keine Nahrung zurück', () => {
    const input = deepFreeze(depart(stateWith(), 0, false, DEFAULT_BALANCE).state);
    const withoutRecycling = { ...modifiers, fallenRecycling: false };
    expect(arrive(input, DEFAULT_BALANCE, withoutRecycling).state.res.food).toBe(input.res.food);
  });
});
