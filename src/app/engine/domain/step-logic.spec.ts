import {
  BalanceParams,
  DEFAULT_BALANCE,
  TICK_MS,
  TICKS_PER_SECOND,
} from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';
import { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import { SiteCandidate } from '@app/site/domain/models/map.model';

import { apply, applyCommand } from './commands-logic';
import { createInitialState } from './game-state-logic';
import { GameEvent } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { step, syncClock } from './step-logic';

const NOW = 1_700_000_000_000;

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

describe('step', () => {
  const createState = (): GameState => deepFreeze(createInitialState({ seed: 'step', now: NOW }));

  it('erhöht now und played um dtMs', () => {
    const { state, events } = step(createState(), TICK_MS);
    expect(state.time).toEqual({ now: NOW + TICK_MS, lastSaved: NOW, played: TICK_MS });
    expect(events).toEqual([]);
  });

  it('verändert die eingefrorene Eingabe nicht', () => {
    const input = createState();
    const before = JSON.stringify(input);
    const { state } = step(input, TICK_MS);
    expect(state).not.toBe(input);
    expect(state.time).not.toBe(input.time);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('teilt alle Teile, die der Schritt nicht ändert', () => {
    const input = createState();
    const { state } = step(input, TICK_MS);
    expect(state.bought).toBe(input.bought);
    expect(state.rngState).toBe(input.rngState);
    expect(state.seed).toBe(input.seed);
    expect(state.era).toBe(input.era);
    expect(state.version).toBe(input.version);
  });

  it('lässt Königinnen brüten und bringt den Grundertrag ein', () => {
    const { state } = step(createState(), TICK_MS);
    expect(state.units.drones.eq(0.0075)).toBe(true);
    expect(state.units.soldiers.eq(0.0025)).toBe(true);
    // 15 + 1,5 · 0,1 − 0,01 · 13,75
    expect(state.res.food.toNumber()).toBeCloseTo(15.0125, 10);
    expect(state.site.stock.toNumber()).toBeCloseTo(19_999.85, 10);
  });

  it('reicht die Parameter an die Brut weiter', () => {
    const params = { ...DEFAULT_BALANCE, queenEggsPerMin: 60 };
    // Alle vier Startpunkte auf Drohnen: `f = 1`, `a = 1`.
    const input = { ...createState(), pheromones: { drones: 4, soldiers: 0, glands: 0 } };
    const { state } = step(input, 1000, params);
    expect(state.units.drones.eq(1)).toBe(true);
    expect(state.units.soldiers.isZero()).toBe(true);
    expect(state.res.food.eq(6.5)).toBe(true);
  });

  it('hängt die Brut bei genug Nahrung kaum von der Schrittweite ab', () => {
    // Ohne Sammeln: Im feinen Raster sammeln frisch geschlüpfte Drohnen sonst schon mit.
    const params = { ...DEFAULT_BALANCE, startFood: 1000, droneCollectRate: 0 };
    const input = deepFreeze(createInitialState({ seed: 'step', now: NOW }, params));
    let fine = input;
    for (let i = 0; i < 10; i++) {
      fine = step(fine, TICK_MS, params).state;
    }
    const coarse = step(input, 10 * TICK_MS, params).state;
    expect(fine.time).toEqual(coarse.time);
    expect(fine.units.drones.toNumber()).toBeCloseTo(coarse.units.drones.toNumber(), 10);
    expect(fine.units.soldiers.toNumber()).toBeCloseTo(coarse.units.soldiers.toNumber(), 10);
    expect(fine.res.food.toNumber()).toBeCloseTo(coarse.res.food.toNumber(), 10);
  });

  describe('mit Sammeln', () => {
    const swarm = (queens: number, drones: number, food: number, stock: number): GameState => {
      const base = createState();
      return deepFreeze({
        ...base,
        res: { ...base.res, food: Num.from(food) },
        units: { queens: Num.from(queens), drones: Num.from(drones), soldiers: Num.ZERO },
        site: { ...base.site, stock: Num.from(stock) },
      });
    };

    it('rechnet Beispiel 1 aus Game-Design §4.3 vollständig', () => {
      const { res, site, units } = step(swarm(1, 10, 5, 1000), TICK_MS).state;
      expect(res.food.toNumber()).toBeCloseTo(5.2125, 10);
      expect(site.stock.toNumber()).toBeCloseTo(999.65, 10);
      expect(units.drones.toNumber()).toBeCloseTo(10.0075, 10);
      expect(units.soldiers.toNumber()).toBeCloseTo(0.0025, 10);
    });

    it('sammelt vor der Brut, frische Nahrung reicht im selben Schritt', () => {
      const { res, units } = step(swarm(1, 10, 0, 1000), TICK_MS).state;
      expect(units.soldiers.toNumber()).toBeCloseTo(0.0025, 10);
      expect(res.food.toNumber()).toBeCloseTo(0.2125, 10);
    });

    it('sammelt mit den Drohnen vom Anfang des Schritts', () => {
      const { site } = step(swarm(100, 10, 1000, 1000), 1000).state;
      expect(site.stock.toNumber()).toBeCloseTo(996.5, 10);
    });

    it('reicht die Parameter an das Sammeln weiter', () => {
      const params = { ...DEFAULT_BALANCE, droneCollectRate: 1 };
      const { res, site } = step(swarm(0, 10, 0, 1000), 1000, params).state;
      expect(res.food.eq(11.5)).toBe(true);
      expect(site.stock.eq(988.5)).toBe(true);
    });

    it('lässt die Brut bei leerem Vorrat weiterlaufen', () => {
      const input = swarm(1, 10, 5, 0);
      const { state } = step(input, TICK_MS);
      expect(state.site).toBe(input.site);
      expect(state.res.food.toNumber()).toBeCloseTo(4.8625, 10);
      expect(state.units.drones.toNumber()).toBeCloseTo(10.0075, 10);
    });
  });

  it('liefert bei gleicher Eingabe dasselbe Ergebnis', () => {
    const input = createState();
    expect(JSON.stringify(step(input, 250))).toBe(JSON.stringify(step(input, 250)));
  });

  it('lässt Zustand ohne Königinnen und ohne Vorrat bis auf die Zeit unverändert', () => {
    const base = createState();
    const input = deepFreeze({
      ...base,
      units: { ...base.units, queens: Num.ZERO },
      site: { ...base.site, stock: Num.ZERO },
    });
    const { state } = step(input, TICK_MS);
    expect(state.res).toBe(input.res);
    expect(state.units).toBe(input.units);
    expect(state.site).toBe(input.site);
    expect(state.time.played).toBe(TICK_MS);
  });

  it.each([0, -0])('gibt bei dtMs %d denselben Zustand zurück', (dtMs) => {
    const input = createState();
    const { state, events } = step(input, dtMs);
    expect(state).toBe(input);
    expect(events).toEqual([]);
  });

  it.each([-1, -Number.MIN_VALUE, Number.NaN, Infinity, -Infinity])(
    'wirft bei ungültigem dtMs %d einen RangeError',
    (dtMs) => {
      expect(() => step(createState(), dtMs)).toThrow(RangeError);
    },
  );

  it('summiert die Zeit über viele Ticks exakt', () => {
    const input = createState();
    const ticks = 3600 * TICKS_PER_SECOND;
    let state = input;
    const events: GameEvent[] = [];
    for (let i = 0; i < ticks; i++) {
      const result = step(state, TICK_MS);
      events.push(...result.events);
      state = deepFreeze(result.state);
    }
    expect(state.time).toEqual({ now: NOW + 3_600_000, lastSaved: NOW, played: 3_600_000 });
    // Die Brut lässt die Drohnen wachsen; ohne Auto-Weiterziehen bleibt es beim leeren Vorrat. Die
    // Funde an den Abbau-Schwellen ziehen aus dem eigenen Strom, der Generator-RNG bleibt.
    expect(events.filter((event) => event.type !== 'found').map((event) => event.type)).toEqual([
      'siteDepleted',
    ]);
    expect(state.rngState).toBe(input.rngState);
  });
});

describe('syncClock', () => {
  const createState = (): GameState =>
    deepFreeze(step(createInitialState({ seed: 'sync', now: NOW }), TICK_MS).state);

  it('setzt nur time.now und lässt played und lastSaved unverändert', () => {
    const input = createState();
    const state = syncClock(input, NOW + 60_000);
    expect(state.time).toEqual({ now: NOW + 60_000, lastSaved: NOW, played: TICK_MS });
    expect(state.res).toBe(input.res);
    expect(input.time.now).toBe(NOW + TICK_MS);
  });

  it('gibt bei gleichem Wert dieselbe Referenz zurück', () => {
    const input = createState();
    expect(syncClock(input, input.time.now)).toBe(input);
  });

  it.each([-1, Number.NaN, Infinity, -Infinity])('wirft bei ungültigem nowMs %d', (nowMs) => {
    expect(() => syncClock(createState(), nowMs)).toThrow(RangeError);
  });
});

describe('step mit Weiterziehen', () => {
  const candidate = (
    type: SiteTypeId,
    x: number,
    y: number,
    size: number,
    defense: number,
  ): SiteCandidate => ({
    type,
    position: { x, y },
    size: Num.from(size),
    defense: Num.from(defense),
  });

  /** Kandidaten aus Game-Design §4.6, Beispiel 3 (K1 bis K4 in Reichweite). */
  const EXAMPLE_3: readonly SiteCandidate[] = [
    candidate('vent', 3, 0, 30_240, 26),
    candidate('bacterial-mat', 0, 3, 55_440, 52),
    candidate('algal-mat', -2, 0, 16_940, 0),
    candidate('vent', 0, -1, 28_000, 20),
    candidate('whale-fall', 5.8, 0, 124_320, 103),
    candidate('methane-seep', 0, 6.5, 108_500, 73),
  ];

  // Die übrigen Reisetests nehmen S = 34 bei Q = 1 mit; dafür braucht es 68 Plätze statt 10.
  const params = { ...DEFAULT_BALANCE, queenSpace: 70 };

  function swarm(candidates: readonly SiteCandidate[] = EXAMPLE_3): GameState {
    const base = createInitialState({ seed: 'reise', now: NOW });
    return deepFreeze({
      ...base,
      res: { ...base.res, food: Num.from(100) },
      units: { queens: Num.ONE, drones: Num.ZERO, soldiers: Num.from(34) },
      site: { ...base.site, stock: Num.from(500) },
      map: { ...base.map, candidates },
    });
  }

  function departed(target: number, input: GameState = swarm()): GameState {
    const { state, events } = applyCommand(input, { type: 'depart', target }, params);
    expect(events.map((event) => event.type)).toEqual(['departed']);
    return deepFreeze(state);
  }

  function run(
    input: GameState,
    totalMs: number,
    dtMs: number,
    runParams: BalanceParams = params,
  ): { state: GameState; events: GameEvent[] } {
    let state = input;
    const events: GameEvent[] = [];
    for (let t = 0; t < totalMs; t += dtMs) {
      const result = step(state, Math.min(dtMs, totalMs - t), runParams);
      state = deepFreeze(result.state);
      events.push(...result.events);
    }
    return { state, events };
  }

  it('rechnet Beispiel 7 aus Game-Design §4.11', () => {
    // Q = 7 bietet 70 Plätze, alle 68 belegten kommen mit; Standardwerte ohne Override.
    const base = swarm();
    const input = deepFreeze({
      ...base,
      res: { ...base.res, food: Num.from(300) },
      units: { ...base.units, queens: Num.from(7) },
    });
    const start = applyCommand(input, { type: 'depart', target: 0 }, DEFAULT_BALANCE);
    expect(start.events.map((event) => event.type)).toEqual(['departed']);
    const { state, events } = run(deepFreeze(start.state), 30_000, TICK_MS, DEFAULT_BALANCE);
    // Unterwegs schlüpfen 21 Eier, gekämpft wird mit S = 39,25.
    expect(state.units.soldiers.toNumber()).toBeCloseTo(39.25 - 8.61, 2);
    expect(state.units.drones.toNumber()).toBeCloseTo(15.75, 10);
    expect(state.res.dna.toNumber()).toBeCloseTo(13.55, 2);
    // Ohne Sammeln unterwegs: nur die Brutkosten von 21 Eiern · 13,75.
    expect(state.res.food.toNumber()).toBeCloseTo(300 - 288.75, 8);
    expect(state.site).toEqual({ type: 'vent', size: Num.from(30_240), stock: Num.from(30_240) });
    expect(state.map.moves).toBe(1);
    expect(state.map.position).toEqual({ x: 3, y: 0 });
    expect(state.travel).toBeNull();
    expect(events).toHaveLength(1);
    const [arrived] = events;
    if (arrived.type !== 'arrived') {
      throw new Error('arrived erwartet');
    }
    expect(arrived.playedMs).toBe(30_000);
    expect(arrived.losses.toNumber()).toBeCloseTo(8.61, 2);
  });

  it('zählt die Restdauer herunter und ruht unterwegs beim Sammeln', () => {
    const input = departed(0);
    // Auch ein (provisorisch) gefüllter Vorrat bringt unterwegs nichts.
    const filled = deepFreeze({ ...input, site: { ...input.site, stock: Num.from(1000) } });
    const { state, events } = step(filled, 1000, params);
    expect(state.travel?.remainingMs).toBe(29_000);
    expect(state.site.stock.eq(1000)).toBe(true);
    expect(state.res.food.toNumber()).toBeCloseTo(100 - 0.1 * 13.75, 10);
    expect(state.units.soldiers.toNumber()).toBeCloseTo(34.025, 10);
    expect(events).toEqual([]);
  });

  it('kommt unabhängig von der Schrittweite zum selben Zeitpunkt an', () => {
    // d = ‖(1,2345; 2)‖ ≈ 2,3503, also keine ganze Zahl von Ticks.
    const input = departed(0, swarm([candidate('vent', 1.2345, 2, 30_000, 10)]));
    const travelMs = input.travel?.remainingMs ?? 0;
    expect(travelMs % TICK_MS).not.toBe(0);
    // Ohne Sammelrate der Drohnen: Im feinen Raster sammeln frisch geschlüpfte Drohnen sonst schon mit.
    const exact = { ...params, droneCollectRate: 0 };
    const runs = [TICK_MS, 1000, 7000, 40_000].map((dtMs) => run(input, 40_000, dtMs, exact));
    const [fine] = runs;
    for (const { state, events } of runs) {
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('arrived');
      expect(events[0].playedMs).toBeCloseTo(travelMs, 6);
      expect(state.time.played).toBeCloseTo(40_000, 6);
      for (const value of [
        (s: GameState) => s.res.food,
        (s: GameState) => s.res.dna,
        (s: GameState) => s.units.drones,
        (s: GameState) => s.units.soldiers,
        (s: GameState) => s.site.stock,
      ]) {
        const expected = value(fine.state).toNumber();
        expect(Math.abs(value(state).toNumber() - expected)).toBeLessThan(1e-9 * expected + 1e-9);
      }
      expect(state.map).toEqual(fine.state.map);
    }
  });

  it('sammelt im Ankunftsschritt erst ab der Ankunft', () => {
    const input = departed(0);
    const { state } = step(input, 31_000, params);
    expect(state.travel).toBeNull();
    // Nach der Ankunft 1 s Grundertrag und Sammeln mit 2,25 Drohnen.
    expect(state.site.stock.toNumber()).toBeCloseTo(30_240 - (1.5 + 2.25 * 0.2), 6);
  });

  it('meldet siteDepleted, wenn der Vorrat durch Sammeln leer wird, nicht beim Aufbruch', () => {
    const base = swarm();
    const input = deepFreeze({ ...base, site: { ...base.site, stock: Num.from(0.1) } });
    const { state, events } = step(input, TICK_MS, params);
    expect(state.site.stock).toBe(Num.ZERO);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: 'siteDepleted', siteType: 'vent' });
    expect(events[0].playedMs).toBeCloseTo((0.1 / 1.5) * 1000, 6);
    expect(step(deepFreeze(state), TICK_MS, params).events).toEqual([]);
    expect(run(departed(0), 1000, TICK_MS).events).toEqual([]);
  });

  describe('Auto-Weiterziehen', () => {
    function withAuto(
      stock: number,
      settings: { enabled?: boolean; threshold?: number },
    ): GameState {
      const base = swarm();
      const state = apply(base, { type: 'setAutoMove', enabled: true, ...settings }, params);
      return deepFreeze({
        ...state,
        site: { ...state.site, size: Num.from(1000), stock: Num.from(stock) },
      });
    }

    it('bricht mit Schwelle 0 im Schritt auf, in dem der Vorrat leer wird', () => {
      const { state, events } = step(withAuto(0.1, { threshold: 0 }), TICK_MS, params);
      expect(events.map((event) => event.type)).toEqual(['siteDepleted', 'departed']);
      const departure = events[1];
      if (departure.type !== 'departed') {
        throw new Error('departed erwartet');
      }
      expect(departure.auto).toBe(true);
      expect(departure.playedMs).toBe(TICK_MS);
      expect(departure.forfeitedStock.isZero()).toBe(true);
      // „Ausgewogen“ wählt K4 (Beispiel 8).
      expect(state.travel).toEqual({ target: EXAMPLE_3[3], remainingMs: 10_000 });
    });

    it('bricht mit Schwelle 0 bei Restvorrat nicht auf', () => {
      const { state, events } = step(withAuto(100, { threshold: 0 }), TICK_MS, params);
      expect(state.travel).toBeNull();
      expect(events).toEqual([]);
    });

    it('bricht mit Schwelle 0,5 auf, sobald V ≤ θ · G', () => {
      expect(step(withAuto(500.2, { threshold: 0.5 }), TICK_MS, params).state.travel).toBeNull();
      const { state, events } = step(withAuto(500.1, { threshold: 0.5 }), TICK_MS, params);
      expect(state.travel?.target).toBe(EXAMPLE_3[3]);
      const departure = events.find((event) => event.type === 'departed');
      // Der Schritt teilt an der Abbau-Schwelle 50 % (V = 500): Danach sammeln auch die im ersten
      // Teil geschlüpften Drohnen, darum etwas mehr als 0,15.
      expect(departure?.type === 'departed' && departure.forfeitedStock.toNumber()).toBeCloseTo(
        500.1 - 0.15,
        4,
      );
    });

    it('bricht ausgeschaltet nicht auf', () => {
      const { state, events } = step(withAuto(0.1, { enabled: false }), TICK_MS, params);
      expect(state.travel).toBeNull();
      expect(events.map((event) => event.type)).toEqual(['siteDepleted']);
    });

    it('bricht nach der Ankunft erst wieder auf, wenn die neue Futterstelle leer ist', () => {
      const traveling = departed(2, withAuto(0, { threshold: 0 }));
      const { state, events } = run(traveling, 20_000 + 2 * TICK_MS, TICK_MS);
      expect(events.map((event) => event.type)).toEqual(['arrived']);
      expect(state.travel).toBeNull();
    });
  });
});

describe('step mit Funden (Game-Design §4.16)', () => {
  /** Ohne Königin keine Brut: Die Abbaurate ist dann über den ganzen Lauf konstant. */
  const params: BalanceParams = {
    ...DEFAULT_BALANCE,
    startQueens: 0,
    ventFindChance: 1,
    algalMatFindChance: 1,
    planktonBloomWeight: 200,
    planktonBloomSeconds: 20,
  };

  function harvesting(): GameState {
    const base = createInitialState({ seed: 'funde', now: NOW }, params);
    return deepFreeze({
      ...base,
      units: { ...base.units, drones: Num.from(10) },
      site: { ...base.site, size: Num.from(1000), stock: Num.from(1000) },
    });
  }

  function run(input: GameState, totalMs: number, dtMs: number) {
    let state = input;
    const events: GameEvent[] = [];
    for (let t = 0; t < totalMs; t += dtMs) {
      const result = step(state, Math.min(dtMs, totalMs - t), params);
      state = deepFreeze(result.state);
      events.push(...result.events);
    }
    return { state, events };
  }

  const summary = (events: readonly GameEvent[]) =>
    events.map((event) =>
      event.type === 'found'
        ? { type: event.type, entry: event.entry, harvestShare: event.harvestShare }
        : { type: event.type },
    );

  it('zieht an jeder Abbau-Schwelle in aufsteigender Reihenfolge, an 100 % nach siteDepleted', () => {
    const { events } = step(harvesting(), 400_000, params);
    expect(summary(events).map((event) => event.type)).toEqual([
      'found',
      'found',
      'found',
      'siteDepleted',
      'found',
    ]);
    const shares = events.flatMap((event) => (event.type === 'found' ? [event.harvestShare] : []));
    expect(shares).toEqual([0.25, 0.5, 0.75, 1]);
    // Der erste Fund jedes Spiels ist DNA.
    expect(events[0]).toMatchObject({ type: 'found', entry: 'foreign-dna', trigger: 'harvest' });
  });

  it('liefert mit einem großen Schritt dieselben Funde und Zustände wie mit vielen kleinen', () => {
    const big = step(harvesting(), 400_000, params);
    const small = run(harvesting(), 400_000, TICK_MS);
    expect(summary(small.events)).toEqual(summary(big.events));
    expect(summary(big.events).filter((event) => event.type === 'found').length).toBe(4);
    // Planktonblüte (×1,5 auf das Sammeln der Drohnen) verkürzt die Abbauzeit, ihr Ablauf teilt.
    expect(
      big.events.some((event) => event.type === 'found' && event.entry === 'plankton-bloom'),
    ).toBe(true);
    big.events.forEach((event, index) => {
      expect(small.events[index].playedMs).toBeCloseTo(event.playedMs, 6);
    });
    const { finds } = big.state;
    expect(small.state.finds.rngState).toBe(finds.rngState);
    expect(small.state.finds.total).toBe(finds.total);
    expect(small.state.finds.collected).toEqual(finds.collected);
    expect(small.state.finds.buffs).toEqual(finds.buffs);
    expect(small.state.res.food.toNumber()).toBeCloseTo(big.state.res.food.toNumber(), 6);
    expect(small.state.res.dna.toNumber()).toBeCloseTo(big.state.res.dna.toNumber(), 10);
    expect(small.state.time).toEqual(big.state.time);
    expect(small.state.rngState).toBe(harvesting().rngState);
  });

  it('setzt einen Buff, wirkt bis zum Ablauf und entfernt ihn an der Schrittgrenze', () => {
    const base = harvesting();
    // Ohne weitere Funde: Vorrat groß, Schwellen weit weg.
    const input = deepFreeze({
      ...base,
      site: { ...base.site, size: Num.from(1e9), stock: Num.from(1e9) },
      finds: { ...base.finds, buffs: [{ id: 'plankton-bloom' as const, expiresAtMs: 150 }] },
    });
    // 1,5 + 10 · 0,2 · 1,5 = 4,5 Nahrung/s bis 150 ms, danach 3,5 Nahrung/s.
    const first = step(input, TICK_MS, params);
    expect(first.state.finds.buffs).toEqual([{ id: 'plankton-bloom', expiresAtMs: 150 }]);
    const second = step(first.state, TICK_MS, params);
    expect(second.state.finds.buffs).toEqual([]);
    const gained = second.state.res.food.sub(input.res.food).toNumber();
    expect(gained).toBeCloseTo(4.5 * 0.15 + 3.5 * 0.05, 10);
    // Ein Schritt über den Ablauf hinweg rechnet genauso.
    const whole = step(input, 2 * TICK_MS, params);
    expect(whole.state.finds.buffs).toEqual([]);
    expect(whole.state.res.food.toNumber()).toBeCloseTo(second.state.res.food.toNumber(), 10);
    // Ein abgelaufener geladener Eintrag verschwindet im nächsten Schritt.
    const loaded = deepFreeze({
      ...input,
      finds: { ...input.finds, buffs: [{ id: 'warm-current' as const, expiresAtMs: 0 }] },
    });
    expect(step(loaded, TICK_MS, params).state.finds.buffs).toEqual([]);
  });

  it('zieht bei der Ankunft nach arrived, für die neue Futterstelle', () => {
    const base = harvesting();
    const target = base.map.candidates.findIndex((candidate) => candidate.type === 'algal-mat');
    const departedState = applyCommand(base, { type: 'depart', target }, params).state;
    const travelMs = departedState.travel?.remainingMs ?? 0;
    const { state, events } = step(departedState, travelMs + TICK_MS, params);
    expect(events.map((event) => event.type).slice(0, 2)).toEqual(['arrived', 'found']);
    expect(events[1]).toMatchObject({
      playedMs: events[0].playedMs,
      siteType: 'algal-mat',
      trigger: 'arrival',
      harvestShare: null,
      entry: 'foreign-dna',
    });
    // DNA mit z = 1 wie ein Schlot in Distanz 1: (20 · 1,35)^0,8 · u_F
    const found = events[1];
    const amount = found.type === 'found' ? (found.amount?.toNumber() ?? 0) : 0;
    expect(amount / 27 ** 0.8).toBeGreaterThanOrEqual(0.8);
    expect(amount / 27 ** 0.8).toBeLessThan(1.2);
    expect(state.finds.total).toBe(1);
  });

  it('zieht beim Aufbruch nicht', () => {
    const base = harvesting();
    const half = deepFreeze({ ...base, site: { ...base.site, stock: Num.from(600) } });
    const target = half.map.candidates.findIndex((candidate) => candidate.type === 'algal-mat');
    const { state, events } = applyCommand(half, { type: 'depart', target }, params);
    expect(events.map((event) => event.type)).toEqual(['departed']);
    expect(state.finds).toBe(half.finds);
  });
});

describe('step mit Onboarding (Game-Design §4.18)', () => {
  const createState = (): GameState =>
    deepFreeze(createInitialState({ seed: 'onboarding', now: NOW }));

  it('behält das Onboarding-Objekt, solange nichts freigeschaltet wird', () => {
    const input = createState();
    const { state } = step(input, TICK_MS);
    expect(state.onboarding).toBe(input.onboarding);
  });

  it('schaltet die Umgebung frei, sobald der Vorrat auf 25 % der Größe sinkt', () => {
    const input = createState();
    const near = deepFreeze({
      ...input,
      units: { ...input.units, drones: Num.from(100) },
      site: { ...input.site, stock: Num.from(5010) },
    });
    expect(step(near, TICK_MS).state.onboarding.unlocked).toEqual([]);
    const { state } = step(near, 1000);
    expect(state.site.stock.lte(5000)).toBe(true);
    expect(state.onboarding).toEqual({ unlocked: ['map'], seenHints: [] });
  });

  it('nutzt den Anteil aus params', () => {
    const params = { ...DEFAULT_BALANCE, mapUnlockStockShare: 1 };
    expect(step(createState(), TICK_MS, params).state.onboarding.unlocked).toEqual(['map']);
  });

  it('schaltet das Genom mit der ersten DNA frei und behält Freischaltungen', () => {
    const input = createState();
    const withDna = deepFreeze({ ...input, res: { ...input.res, dna: Num.from(0.5) } });
    const unlocked = step(withDna, TICK_MS).state;
    expect(unlocked.onboarding.unlocked).toEqual(['genome']);
    const spent = { ...unlocked, res: { ...unlocked.res, dna: Num.ZERO } };
    const later = step(spent, TICK_MS).state;
    expect(later.onboarding).toBe(unlocked.onboarding);
  });
});
