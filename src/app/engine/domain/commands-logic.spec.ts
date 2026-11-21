import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Num } from '@app/shared/util/num/num';

import { apply, applyCommand, Command } from './commands-logic';
import { createInitialState } from './game-state-logic';

describe('apply', () => {
  const state = Object.freeze(createInitialState({ seed: 'idleswarm', now: 1000 }));

  it('gibt bei noop dieselbe Referenz zurück', () => {
    expect(apply(state, { type: 'noop' })).toBe(state);
  });

  it('weist unbekannte Kommandos beim Kompilieren und zur Laufzeit ab', () => {
    // @ts-expect-error: `unknown` gehört nicht zur Union `Command`.
    const cmd: Command = { type: 'unknown' };
    expect(() => apply(state, cmd)).toThrow(new TypeError('Unbekanntes Kommando: unknown'));
  });

  describe('sacrificeDrones', () => {
    const withDrones = Object.freeze({
      ...state,
      units: Object.freeze({ ...state.units, drones: Num.from(10) }),
    });

    it('opfert Drohnen für Nahrung (Beispiel 6)', () => {
      const next = apply(withDrones, { type: 'sacrificeDrones', count: 10 });
      expect(next.units.drones.isZero()).toBe(true);
      expect(next.res.food.eq(withDrones.res.food.add(50))).toBe(true);
      expect(withDrones.units.drones.eq(10)).toBe(true);
    });

    it.each([0, -3, NaN])('gibt bei count = %d denselben Zustand zurück', (count) => {
      expect(apply(withDrones, { type: 'sacrificeDrones', count })).toBe(withDrones);
    });
  });

  describe('convertDronesToQueen', () => {
    it('wandelt 12 Drohnen in eine Königin um', () => {
      const current = Object.freeze({
        ...state,
        units: Object.freeze({ ...state.units, drones: Num.from(12) }),
      });
      const next = apply(current, { type: 'convertDronesToQueen' });
      expect(next.units.queens.eq(state.units.queens.add(1))).toBe(true);
      expect(next.units.drones.toNumber()).toBeCloseTo(0, 12);
      expect(next.bought.queens.eq(1)).toBe(true);
    });

    it('gibt ohne genug Drohnen denselben Zustand zurück', () => {
      expect(apply(state, { type: 'convertDronesToQueen' })).toBe(state);
    });
  });

  describe('setTransportPriority', () => {
    it('setzt die Priorität', () => {
      const next = apply(state, { type: 'setTransportPriority', priority: 'soldiers-first' });
      expect(next.priority).toBe('soldiers-first');
      expect(state.priority).toBe('balanced');
    });

    it('gibt bei unbekannter ID denselben Zustand zurück', () => {
      // @ts-expect-error: `queens-first` ist keine Mitnahme-Priorität.
      const cmd: Command = { type: 'setTransportPriority', priority: 'queens-first' };
      expect(apply(state, cmd)).toBe(state);
    });
  });

  describe('depart', () => {
    // Der Seed „idleswarm“ erzeugt als ersten Kandidaten eine Algenmatte bei (−1,3355; −2,3790).
    const travelMs = Math.hypot(1.3355202136, 2.3790464258) * 10_000;

    it('bricht auf und meldet departed mit Auslöser manuell', () => {
      const { state: next, events } = applyCommand(state, { type: 'depart', target: 0 });
      expect(next.travel?.target).toBe(state.map.candidates[0]);
      expect(next.travel?.remainingMs).toBeCloseTo(travelMs, 4);
      expect(next.site.stock.isZero()).toBe(true);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: 'departed',
        playedMs: 0,
        siteType: 'algal-mat',
        auto: false,
      });
    });

    it('liefert über apply denselben Zustand ohne Ereignisse', () => {
      expect(apply(state, { type: 'depart', target: 0 })).toEqual(
        applyCommand(state, { type: 'depart', target: 0 }).state,
      );
    });

    it.each([-1, 6, 0.5, Number.NaN])('bleibt beim Ziel %d ohne Wirkung', (target) => {
      expect(applyCommand(state, { type: 'depart', target })).toEqual({ state, events: [] });
      expect(apply(state, { type: 'depart', target })).toBe(state);
    });

    it('bleibt während einer Reise ohne Wirkung', () => {
      const traveling = Object.freeze(apply(state, { type: 'depart', target: 0 }));
      expect(apply(traveling, { type: 'depart', target: 0 })).toBe(traveling);
    });

    it('liefert für Kommandos ohne Ereignis eine leere Liste', () => {
      expect(applyCommand(state, { type: 'buy', unit: 'drones' }).events).toEqual([]);
    });
  });

  describe('setPheromones', () => {
    it('verteilt die Punkte, auch während einer Reise', () => {
      const traveling = Object.freeze(apply(state, { type: 'depart', target: 0 }));
      const result = applyCommand(traveling, { type: 'setPheromones', drones: 0, soldiers: 4 });
      expect(result.state.pheromones).toEqual({ drones: 0, soldiers: 4, glands: 0 });
      expect(result.state.travel).toBe(traveling.travel);
      expect(result.events).toEqual([]);
    });

    it.each([
      [3, 2],
      [-1, 1],
      [1.5, 1],
    ])('bleibt bei %d : %d ohne Wirkung', (drones, soldiers) => {
      expect(applyCommand(state, { type: 'setPheromones', drones, soldiers })).toEqual({
        state,
        events: [],
      });
      expect(apply(state, { type: 'setPheromones', drones, soldiers })).toBe(state);
    });
  });

  describe('strengthenGland', () => {
    const rich = Object.freeze({
      ...state,
      res: Object.freeze({ ...state.res, food: Num.from(250) }),
    });

    it('kauft einen Drüsenpunkt, auch während einer Reise', () => {
      const traveling = Object.freeze(apply(rich, { type: 'depart', target: 0 }));
      const result = applyCommand(traveling, { type: 'strengthenGland' });
      expect(result.state.pheromones.glands).toBe(1);
      expect(result.state.res.food.eq(150)).toBe(true);
      expect(result.events).toEqual([]);
    });

    it('bleibt ohne genug Nahrung ohne Wirkung', () => {
      expect(applyCommand(state, { type: 'strengthenGland' })).toEqual({ state, events: [] });
      expect(apply(state, { type: 'strengthenGland' })).toBe(state);
    });
  });

  describe('setAutoMove', () => {
    it('setzt die Einstellungen und begrenzt die Schwelle', () => {
      const next = apply(
        state,
        { type: 'setAutoMove', enabled: true, strategy: 'least-resistance', threshold: 2 },
        DEFAULT_BALANCE,
      );
      expect(next.auto).toEqual({ enabled: true, strategy: 'least-resistance', threshold: 0.9 });
    });

    it('bleibt bei ungültigen Werten ohne Wirkung', () => {
      // @ts-expect-error: `greedy` ist keine Strategie.
      const cmd: Command = { type: 'setAutoMove', strategy: 'greedy' };
      expect(apply(state, cmd)).toBe(state);
      expect(apply(state, { type: 'setAutoMove', threshold: Number.NaN })).toBe(state);
    });
  });

  describe('evolve (Game-Design §4.14)', () => {
    const rich = Object.freeze({
      ...state,
      res: Object.freeze({ ...state.res, dna: Num.from(10) }),
    });

    it('entwickelt einen Knoten für DNA und meldet `evolved`', () => {
      const result = applyCommand(rich, { type: 'evolve', node: 'cilia-1' });
      expect(result.state.genome.owned).toEqual(['cilia-1']);
      expect(result.state.res.dna.eq(2)).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toMatchObject({
        type: 'evolved',
        node: 'cilia-1',
        playedMs: rich.time.played,
      });
    });

    it('gibt ohne Wirkung denselben Zustand ohne Ereignisse zurück', () => {
      const result = applyCommand(rich, { type: 'evolve', node: 'cilia-2' });
      expect(result.state).toBe(rich);
      expect(result.events).toEqual([]);
      expect(apply(state, { type: 'evolve', node: 'cilia-1' })).toBe(state);
    });
  });
  describe('updateSettings (US-09.01)', () => {
    it('ändert eine oder mehrere Einstellungen', () => {
      const one = apply(state, {
        type: 'updateSettings',
        settings: { numberFormat: 'scientific' },
      });
      expect(one.settings).toEqual({
        numberFormat: 'scientific',
        motion: 'system',
        autosaveIntervalMs: 30_000,
      });
      const two = apply(one, {
        type: 'updateSettings',
        settings: { motion: 'reduced', autosaveIntervalMs: 300_000 },
      });
      expect(two.settings).toEqual({
        numberFormat: 'scientific',
        motion: 'reduced',
        autosaveIntervalMs: 300_000,
      });
      expect(two.onboarding).toBe(state.onboarding);
    });

    it('bleibt ohne Änderung oder mit einem Wert außerhalb der Listen ohne Wirkung', () => {
      expect(apply(state, { type: 'updateSettings', settings: {} })).toBe(state);
      expect(apply(state, { type: 'updateSettings', settings: { motion: 'system' } })).toBe(state);
      expect(
        apply(state, {
          type: 'updateSettings',
          settings: { motion: 'full', autosaveIntervalMs: 15_000 },
        }),
      ).toBe(state);
      // @ts-expect-error: `roman` ist kein Zahlenformat.
      const cmd: Command = { type: 'updateSettings', settings: { numberFormat: 'roman' } };
      expect(applyCommand(state, cmd)).toEqual({ state, events: [] });
    });
  });

  describe('Hinweise (US-09.04)', () => {
    it('markiert Hinweise als gesehen, in Listenreihenfolge', () => {
      const first = apply(state, { type: 'markHintSeen', hint: 'auto-move' });
      const second = apply(first, { type: 'markHintSeen', hint: 'collect' });
      expect(second.onboarding.seenHints).toEqual(['collect', 'auto-move']);
      expect(apply(second, { type: 'markHintSeen', hint: 'collect' })).toBe(second);
    });

    it('setzt alle Hinweise zurück und behält die Freischaltungen', () => {
      const seen = Object.freeze({
        ...state,
        onboarding: Object.freeze({
          unlocked: Object.freeze(['pheromones'] as const),
          seenHints: Object.freeze(['collect', 'pheromones'] as const),
        }),
      });
      const reset = apply(seen, { type: 'resetHints' });
      expect(reset.onboarding).toEqual({ unlocked: ['pheromones'], seenHints: [] });
      expect(apply(reset, { type: 'resetHints' })).toBe(reset);
    });
  });

  describe('Freischaltungen nach Kommandos (Game-Design §4.18)', () => {
    it('schaltet nach einem wirksamen Kommando frei, was der neue Zustand erreicht', () => {
      const rich = Object.freeze({
        ...state,
        res: Object.freeze({ ...state.res, food: Num.from(99) }),
      });
      // Ein wirksames Kommando ohne Bezug zur Drüse genügt, wenn der Zustand die Schwelle erreicht.
      const atPrice = Object.freeze({
        ...rich,
        res: Object.freeze({ ...rich.res, food: Num.from(100) }),
      });
      expect(atPrice.onboarding.unlocked).toEqual([]);
      const next = apply(atPrice, { type: 'setTransportPriority', priority: 'drones-first' });
      expect(next.onboarding.unlocked).toEqual(['pheromones']);
      const bought = apply(rich, { type: 'buy', unit: 'drones' });
      expect(bought.onboarding.unlocked).toEqual([]);
    });

    it('lässt ein wirkungsloses Kommando auch bei offener Freischaltung ohne Wirkung', () => {
      const atPrice = Object.freeze({
        ...state,
        res: Object.freeze({ ...state.res, food: Num.from(100) }),
      });
      expect(apply(atPrice, { type: 'noop' })).toBe(atPrice);
      expect(apply(atPrice, { type: 'markHintSeen', hint: 'collect' }).onboarding).toEqual({
        unlocked: ['pheromones'],
        seenHints: ['collect'],
      });
    });

    it('nimmt eine Freischaltung nie zurück', () => {
      const rich = Object.freeze({
        ...state,
        res: Object.freeze({ ...state.res, food: Num.from(120) }),
      });
      const unlocked = apply(rich, { type: 'setTransportPriority', priority: 'drones-first' });
      expect(unlocked.onboarding.unlocked).toEqual(['pheromones']);
      const spent = apply(unlocked, { type: 'buy', unit: 'queens' });
      expect(spent.res.food.lt(100)).toBe(true);
      expect(spent.onboarding.unlocked).toEqual(['pheromones']);
    });
  });
});
