import { DEFAULT_BALANCE, TICK_MS } from '@app/balance/domain/constants';
import { broodFoodPerSecond, foodPerSecond, maxCatchUpMs } from '@app/balance/domain/formulas';
import { createActiveBot } from '@app/model/domain/bots/active-bot-logic';
import { createIdleBot } from '@app/model/domain/bots/idle-bot-logic';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_HOUR, MS_PER_MINUTE } from '@app/shared/util/time/time-units';

import type { Bot } from './bot-logic';
import {
  catchUp,
  CatchUpSummary,
  isReturnSummaryDue,
  mergeCatchUpSummaries,
  RETURN_SUMMARY_MIN_MS,
} from './catch-up-logic';
import { createInitialState } from './game-state-logic';
import type { GameEvent } from './models/game-event.model';
import type { GameState } from './models/game-state.model';
import { stateModifiers } from './modifiers-logic';
import { runSimulationWithState } from './runner-logic';
import { step } from './step-logic';

/**
 * Abweichung des groben Nachholens vom 100-ms-Takt bei Nahrung, DNA und Einheiten. Gemessen bis rund
 * 0,45 % (Bot-Stände „Aktiv“ und „Idle“ nach 5 min bis 3 h, je 1 h nachgeholt): Im groben Schritt
 * sammeln frisch geschlüpfte Drohnen erst ab dem nächsten Schritt. Am größten ist das, wenn die
 * Nahrung die Brut begrenzt, weil dann jede Drohne sofort neue Brut bezahlt (exponentielles
 * Wachstum); eine Teilung am Übergang hilft dagegen nicht, der Fehler wächst mit der Schrittweite.
 */
const TOLERANCE = 0.005;
/** Mit Kämpfen gemessen rund 1,3 %: Die Verluste wachsen mit `(B / A)²` (Game-Design §4.10). */
const COMBAT_TOLERANCE = 0.02;

/** Zeitbudget für 24 h; gemessen rund 1,1 s (Ziel TK §4: < 1 s), Puffer für parallele Prozesse. */
const BUDGET_MS = 2500;

/** Fortgeschrittener Stand aus einem Bot-Lauf: Königinnen, Drüse, Auto-Weiterziehen. */
function advanced(bot: Bot, durationMs: number): GameState {
  return runSimulationWithState({
    seed: 'offline',
    bot,
    durationMs,
    sampleEveryMs: MS_PER_HOUR,
  }).state;
}

function tickByTick(
  state: GameState,
  durationMs: number,
): { state: GameState; events: GameEvent[] } {
  let current = state;
  const events: GameEvent[] = [];
  for (let i = 0; i < durationMs / TICK_MS; i++) {
    const result = step(current, TICK_MS, DEFAULT_BALANCE);
    events.push(...result.events);
    current = result.state;
  }
  return { state: current, events };
}

function relativeError(actual: Num, expected: Num): number {
  return Math.abs(actual.toNumber() - expected.toNumber()) / Math.max(1, expected.toNumber());
}

function expectClose(coarse: GameState, exact: GameState, tolerance = TOLERANCE): void {
  expect(relativeError(coarse.res.food, exact.res.food)).toBeLessThan(tolerance);
  expect(relativeError(coarse.res.dna, exact.res.dna)).toBeLessThan(tolerance);
  expect(relativeError(coarse.units.drones, exact.units.drones)).toBeLessThan(tolerance);
  expect(relativeError(coarse.units.soldiers, exact.units.soldiers)).toBeLessThan(tolerance);
  expect(coarse.time.played).toBe(exact.time.played);
  expect(coarse.map.route.length).toBe(exact.map.route.length);
  expect(coarse.finds.total).toBe(exact.finds.total);
  expect(coarse.finds.collected).toEqual(exact.finds.collected);
}

describe('catchUp', () => {
  let start: GameState;

  beforeAll(() => {
    start = advanced(createActiveBot(), MS_PER_HOUR);
  });

  describe('gegen den 100-ms-Takt', () => {
    it('holt 2 h aus einem fortgeschrittenen Stand mit Auto-Weiterziehen nach', () => {
      expect(start.auto.enabled).toBe(true);
      const coarse = catchUp(start, 2 * MS_PER_HOUR, 'load');
      const exact = tickByTick(start, 2 * MS_PER_HOUR);

      expectClose(coarse.state, exact.state);
      expect(coarse.state.map.route.length).toBeGreaterThan(start.map.route.length);
      expect(coarse.summary.finds.length).toBeGreaterThan(0);
      expect(coarse.events.map((event) => event.type)).toEqual(
        exact.events.map((event) => event.type),
      );
    });

    it('trifft Kämpfe der Strategie „Kampferprobt“', () => {
      const battle = { ...start, auto: { ...start.auto, strategy: 'battle-hardened' as const } };
      const coarse = catchUp(battle, MS_PER_HOUR, 'load');
      const exact = tickByTick(battle, MS_PER_HOUR);

      expectClose(coarse.state, exact.state, COMBAT_TOLERANCE);
      expect(coarse.summary.arrivals.length).toBeGreaterThan(0);
    });

    it('bleibt genau, wenn die Nahrung die Brut begrenzt', () => {
      // Nach 30 min „Idle“ übersteigt der Nahrungsbedarf der Brut den Zufluss.
      const hungry = advanced(createIdleBot(), 30 * MS_PER_MINUTE);
      const modifiers = stateModifiers(hungry, DEFAULT_BALANCE);
      expect(
        broodFoodPerSecond(hungry.units, hungry.pheromones, DEFAULT_BALANCE, modifiers).gt(
          foodPerSecond(hungry.units, hungry.site.stock, DEFAULT_BALANCE, modifiers),
        ),
      ).toBe(true);
      const coarse = catchUp(hungry, MS_PER_HOUR, 'load');
      const exact = tickByTick(hungry, MS_PER_HOUR);

      expectClose(coarse.state, exact.state);
    });
  });

  describe('Obergrenze und Uhr', () => {
    const fresh = createInitialState({ seed: 'grenze', now: 1_000 });

    it('deckelt bei T_max und meldet die verworfene Zeit', () => {
      const params = { ...DEFAULT_BALANCE, maxCatchUpHours: 0.5 };
      const { state, summary } = catchUp(fresh, 2 * MS_PER_HOUR, 'load', params);
      expect(state.time.played).toBe(30 * MS_PER_MINUTE);
      expect(state.time.now).toBe(1_000 + 30 * MS_PER_MINUTE);
      expect(summary).toMatchObject({
        requestedMs: 2 * MS_PER_HOUR,
        caughtUpMs: 30 * MS_PER_MINUTE,
        discardedMs: 90 * MS_PER_MINUTE,
        capped: true,
      });
    });

    it('nutzt als Startwert 24 h', () => {
      expect(maxCatchUpMs(DEFAULT_BALANCE)).toBe(24 * MS_PER_HOUR);
    });

    it.each([-5000, 0, Number.NaN, -Infinity])('holt bei %d nichts nach', (elapsedMs) => {
      const { state, events, summary } = catchUp(fresh, elapsedMs, 'load');
      expect(state).toBe(fresh);
      expect(events).toEqual([]);
      expect(summary).toMatchObject({
        requestedMs: 0,
        caughtUpMs: 0,
        discardedMs: 0,
        capped: false,
        departures: 0,
      });
      expect(summary.food.net.isZero()).toBe(true);
    });
  });

  it('ist deterministisch', () => {
    const first = catchUp(start, 20 * MS_PER_MINUTE, 'background');
    const second = catchUp(start, 20 * MS_PER_MINUTE, 'background');
    expect(second).toEqual(first);
  });

  describe('Zusammenfassung', () => {
    it('leitet Nahrung, DNA, Einheiten, Futterstellen und Funde ab', () => {
      const { state, events, summary } = catchUp(start, 2 * MS_PER_HOUR, 'load');
      const departed = events.filter((event) => event.type === 'departed');
      const arrived = events.filter((event) => event.type === 'arrived');
      const found = events.filter((event) => event.type === 'found');
      expect(summary.source).toBe('load');
      expect(summary.departures).toBe(departed.length);
      expect(summary.arrivals).toEqual(arrived.map((event) => event.siteType));
      expect(summary.finds).toEqual(found);
      expect(summary.dna.toNumber()).toBeCloseTo(
        state.res.dna.toNumber() - start.res.dna.toNumber(),
        6,
      );

      const leftBehind = departed.reduce(
        (sum, event) => sum + event.leftBehind.drones.toNumber(),
        0,
      );
      expect(summary.lost.drones.toNumber()).toBeCloseTo(leftBehind, 6);
      expect(summary.lost.queens.isZero()).toBe(true);
      expect(summary.hatched.queens.isZero()).toBe(true);
      expect(
        start.units.drones.add(summary.hatched.drones).sub(summary.lost.drones).toNumber(),
      ).toBeCloseTo(state.units.drones.toNumber(), 6);
      expect(
        start.units.soldiers.add(summary.hatched.soldiers).sub(summary.lost.soldiers).toNumber(),
      ).toBeCloseTo(state.units.soldiers.toNumber(), 6);

      const { gained, spentOnBrood, net } = summary.food;
      expect(net.toNumber()).toBeCloseTo(state.res.food.toNumber() - start.res.food.toNumber(), 0);
      expect(gained.sub(spentOnBrood).toNumber()).toBeCloseTo(net.toNumber(), 0);
      expect(spentOnBrood.toNumber()).toBeCloseTo(
        summary.hatched.drones.toNumber() * DEFAULT_BALANCE.droneCost +
          summary.hatched.soldiers.toNumber() * DEFAULT_BALANCE.soldierCost,
        0,
      );
    });

    it('zeigt die Rückkehr-Zusammenfassung ab 5 min Abwesenheit', () => {
      expect(RETURN_SUMMARY_MIN_MS).toBe(5 * MS_PER_MINUTE);
      const fresh = createInitialState({ seed: 'kurz', now: 0 });
      expect(isReturnSummaryDue(catchUp(fresh, 5 * MS_PER_MINUTE - 1, 'load').summary)).toBe(false);
      expect(isReturnSummaryDue(catchUp(fresh, 5 * MS_PER_MINUTE, 'load').summary)).toBe(true);
    });

    it('fasst zwei Nachholvorgänge zusammen', () => {
      const first = catchUp(start, 30 * MS_PER_MINUTE, 'load');
      const second = catchUp(first.state, 30 * MS_PER_MINUTE, 'background');
      const both = catchUp(start, MS_PER_HOUR, 'load');
      const merged: CatchUpSummary = mergeCatchUpSummaries(first.summary, second.summary);
      expect(merged.source).toBe('load');
      expect(merged.requestedMs).toBe(MS_PER_HOUR);
      expect(merged.arrivals).toEqual([...first.summary.arrivals, ...second.summary.arrivals]);
      expect(merged.finds).toHaveLength(first.summary.finds.length + second.summary.finds.length);
      expect(merged.dna.toNumber()).toBeCloseTo(
        first.summary.dna.toNumber() + second.summary.dna.toNumber(),
        6,
      );
      expect(relativeError(merged.food.net, both.summary.food.net)).toBeLessThan(TOLERANCE);
    });
  });

  describe('Leistung', () => {
    it('holt 24 h im Budget nach', { timeout: 30_000, retry: 2 }, () => {
      const begin = performance.now();
      const { state } = catchUp(start, 24 * MS_PER_HOUR, 'load');
      expect(performance.now() - begin).toBeLessThan(BUDGET_MS);
      expect(state.time.played).toBe(start.time.played + 24 * MS_PER_HOUR);
    });
  });
});
