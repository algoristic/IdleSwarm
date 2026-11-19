import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { modifierFactor, NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import { findEntryWeight, siteFindChance, weightedIndex } from '@app/balance/domain/formulas';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import { Num } from '@app/shared/util/num/num';
import { nextRandom, seedToRngState } from '@app/shared/util/rng/rng';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import { FIND_ENTRIES_BY_SITE } from './data/finds-era1.data';
import {
  buffEffects,
  drawFind,
  findsRngState,
  initialFinds,
  isFindTargetReached,
  nextBuffExpiryMs,
  nextHarvestThreshold,
  pruneBuffs,
} from './finds-logic';
import type { FoundEvent } from './models/finds-event.model';
import type { FindEntryId, Finds } from './models/finds.model';

const params = DEFAULT_BALANCE;

/** Die drei Zufallszahlen einer Ziehung ab `rngState`. */
function triple(rngState: number): [number, number, number] {
  const first = nextRandom(rngState);
  const second = nextRandom(first.rngState);
  const third = nextRandom(second.rngState);
  return [first.value, second.value, third.value];
}

/** Erster Fund-RNG-Zustand ab 0, dessen Ziehung die Bedingung erfüllt. */
function rngWhere(predicate: (randoms: [number, number, number]) => boolean): number {
  for (let state = 0; state < 1_000_000; state++) {
    if (predicate(triple(state))) {
      return state;
    }
  }
  throw new Error('kein passender RNG-Zustand');
}

/** Gewichtsindex des Eintrags am Typ: `r_2` mitten in seinem Anteil. */
function drawsEntry(type: SiteTypeId, id: FindEntryId, r2: number): boolean {
  const entries = FIND_ENTRIES_BY_SITE[type];
  const weights = entries.map((entry) => findEntryWeight(entry.id, params));
  return entries[weightedIndex(r2, weights)].id === id;
}

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

describe('drawFind (Game-Design §4.16)', () => {
  const initial = createInitialState({ seed: 'funde', now: 0 });

  /** Zustand an einem Typ mit gegebenem Fund-RNG, Fundzähler und Sammlung. */
  function at(type: SiteTypeId, rngState: number, finds: Partial<Finds> = {}): GameState {
    return {
      ...initial,
      time: { ...initial.time, played: 60_000 },
      site: { type, size: Num.from(20_000), stock: Num.from(20_000) },
      finds: { ...initial.finds, total: 1, ...finds, rngState },
    };
  }

  function found(state: GameState, modifiers = NEUTRAL_MODIFIERS): FoundEvent {
    const { events } = drawFind(state, 'arrival', null, params, modifiers);
    expect(events).toHaveLength(1);
    return events[0];
  }

  it('verbraucht genau drei Zufallszahlen, auch ohne Fund, und lässt den Generator-RNG', () => {
    const miss = rngWhere(([r1]) => r1 >= 0.2);
    const hit = rngWhere(([r1]) => r1 < 0.2);
    for (const rngState of [miss, hit]) {
      const state = at('vent', rngState);
      const result = drawFind(state, 'arrival', null, params, NEUTRAL_MODIFIERS);
      const third = nextRandom(nextRandom(nextRandom(rngState).rngState).rngState).rngState;
      expect(result.state.finds.rngState).toBe(third);
      expect(result.state.rngState).toBe(state.rngState);
    }
  });

  it('zieht ohne Fund nichts, mit `r_1 < p` genau einen Fund (Chance je Typ)', () => {
    // Schlot p = 0,2: knapp darunter Fund, knapp darüber keiner.
    const below = rngWhere(([r1]) => r1 > 0.19 && r1 < 0.2);
    const above = rngWhere(([r1]) => r1 >= 0.2 && r1 < 0.21);
    const missed = drawFind(at('vent', above), 'arrival', null, params, NEUTRAL_MODIFIERS);
    expect(missed.events).toEqual([]);
    expect(missed.state.finds.total).toBe(1);
    expect(missed.state.res).toBe(initial.res);
    const hit = drawFind(at('vent', below), 'arrival', null, params, NEUTRAL_MODIFIERS);
    expect(hit.events).toHaveLength(1);
    expect(hit.state.finds.total).toBe(2);
    // Am Walsturz (p = 0,4) ist dieselbe Zahl ein Fund.
    expect(siteFindChance('whale-fall', params)).toBe(0.4);
    const whale = drawFind(at('whale-fall', above), 'arrival', null, params, NEUTRAL_MODIFIERS);
    expect(whale.events).toHaveLength(1);
  });

  it('rechnet `p = min(1, p_Typ · M_fund)`', () => {
    const rngState = rngWhere(([r1]) => r1 > 0.2 && r1 < 0.25);
    const modifiers = { ...NEUTRAL_MODIFIERS, findChance: { add: 0.25, mul: 1 } };
    expect(drawFind(at('vent', rngState), 'arrival', null, params, modifiers).events).toHaveLength(
      1,
    );
    const certain = { ...NEUTRAL_MODIFIERS, findChance: { add: 9, mul: 1 } };
    const late = rngWhere(([r1]) => r1 > 0.999);
    expect(drawFind(at('vent', late), 'arrival', null, params, certain).events).toHaveLength(1);
  });

  it('macht den ersten Fund des Spiels unabhängig von `r_2` zu Fremder DNA', () => {
    const rngState = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'pyrite', r2));
    const event = found(at('vent', rngState, { total: 0 }));
    expect(event).toMatchObject({ entry: 'foreign-dna', kind: 'dna', replaced: null });
    // Ab dem zweiten Fund zählt die gewichtete Ziehung.
    expect(found(at('vent', rngState))).toMatchObject({ entry: 'pyrite', kind: 'collectible' });
  });

  it('zieht gewichtet in der Reihenfolge der Fundtabelle über die Einträge am Typ', () => {
    // Schlot, Summe 94: Fremde DNA [0; 30), Nährstoffblase [30; 50), Planktonblüte [50; 58) …
    const cases: [number, FindEntryId][] = [
      [0.1, 'foreign-dna'],
      [40 / 94, 'nutrient-bubble'],
      [55 / 94, 'plankton-bloom'],
      [60 / 94, 'warm-current'],
      [68 / 94, 'thermophile'],
      [72 / 94, 'sulfur-pearl'],
    ];
    for (const [r2, id] of cases) {
      const rngState = rngWhere(
        ([r1, random]) =>
          r1 < 0.2 && Math.abs(random - r2) < 0.004 && drawsEntry('vent', id, random),
      );
      expect(found(at('vent', rngState)).entry).toBe(id);
    }
    // Chloroplast gibt es nur an Algenmatten.
    expect(FIND_ENTRIES_BY_SITE.vent.map((entry) => entry.id)).not.toContain('chloroplast');
    expect(FIND_ENTRIES_BY_SITE['algal-mat'].map((entry) => entry.id)).toContain('chloroplast');
  });

  it('schreibt DNA mit `z` und `u_F` gut (Tabelle in §4.16)', () => {
    const rngState = rngWhere(
      ([r1, r2, r3]) =>
        r1 < 0.2 && drawsEntry('vent', 'foreign-dna', r2) && Math.abs(r3 - 0.5) < 1e-3,
    );
    const [, , r3] = triple(rngState);
    const spread = 0.8 + 0.4 * r3;
    for (const [moves, dna] of [
      [0, 10.99],
      [1, 13.97],
      [5, 36.5],
      [10, 121],
    ] as const) {
      const state = { ...at('vent', rngState), map: { ...initial.map, moves } };
      const result = drawFind(state, 'arrival', null, params, NEUTRAL_MODIFIERS);
      const event = result.events[0];
      expect(event.amount?.toNumber()).toBeCloseTo(dna * spread, dna < 100 ? 1 : 0);
      expect(result.state.res.dna.toNumber()).toBeCloseTo(event.amount?.toNumber() ?? NaN, 10);
    }
  });

  it('schreibt Nahrung als Anteil der Größe gut (Beispiel: Schlot mit 20.000 → 1.000 · u_F)', () => {
    const rngState = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'nutrient-bubble', r2));
    const [, , r3] = triple(rngState);
    const result = drawFind(at('vent', rngState), 'harvest', 2, params, NEUTRAL_MODIFIERS);
    const event = result.events[0];
    expect(event).toMatchObject({ trigger: 'harvest', threshold: 2, kind: 'food' });
    expect(event.amount?.toNumber()).toBeCloseTo(1000 * (0.8 + 0.4 * r3), 8);
    expect(result.state.res.food.sub(initial.res.food).toNumber()).toBeCloseTo(
      event.amount?.toNumber() ?? NaN,
      8,
    );
  });

  it('setzt einen Buff mit Ablauf in Spielzeit und verlängert ihn', () => {
    const rngState = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'plankton-bloom', r2));
    const fresh = drawFind(at('vent', rngState), 'arrival', null, params, NEUTRAL_MODIFIERS);
    expect(fresh.events[0]).toMatchObject({ kind: 'buff', buffExpiresAtMs: 660_000, amount: null });
    expect(fresh.state.finds.buffs).toEqual([{ id: 'plankton-bloom', expiresAtMs: 660_000 }]);
    // Läuft der Buff noch, verlängert ein weiterer Fund ab dem alten Ablauf.
    const running = at('vent', rngState, {
      buffs: [
        { id: 'plankton-bloom', expiresAtMs: 100_000 },
        { id: 'warm-current', expiresAtMs: 90_000 },
      ],
    });
    expect(drawFind(running, 'arrival', null, params, NEUTRAL_MODIFIERS).state.finds.buffs).toEqual(
      [
        { id: 'plankton-bloom', expiresAtMs: 700_000 },
        { id: 'warm-current', expiresAtMs: 90_000 },
      ],
    );
    // Ein abgelaufener, noch nicht entfernter Eintrag beginnt bei `t`.
    const expired = at('vent', rngState, { buffs: [{ id: 'plankton-bloom', expiresAtMs: 1_000 }] });
    expect(drawFind(expired, 'arrival', null, params, NEUTRAL_MODIFIERS).state.finds.buffs).toEqual(
      [{ id: 'plankton-bloom', expiresAtMs: 660_000 }],
    );
  });

  it('zählt Fragmente, meldet den Fortschritt und schaltet die Adaption frei', () => {
    const rngState = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'thermophile', r2));
    const first = found(at('vent', rngState));
    expect(first).toMatchObject({
      entry: 'thermophile',
      fragment: { found: 1, required: 3 },
      unlocked: null,
    });
    const last = drawFind(
      at('vent', rngState, { collected: { thermophile: 2 } }),
      'arrival',
      null,
      params,
      NEUTRAL_MODIFIERS,
    );
    expect(last.events[0]).toMatchObject({
      fragment: { found: 3, required: 3 },
      unlocked: 'thermosynthesis',
    });
    expect(last.state.finds.collected).toEqual({ thermophile: 3 });
    // Über `collected` wirkt Thermosynthese an Schloten sofort (§4.14).
    expect(modifierFactor(stateModifiers(last.state, params).collectRate)).toBeCloseTo(1.25, 12);
  });

  it('macht einen Fund mit erreichtem Ziel zu Fremder DNA und nennt den Eintrag', () => {
    const fragment = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'thermophile', r2));
    const complete = at('vent', fragment, { collected: { thermophile: 3 } });
    const event = found(complete);
    expect(event).toMatchObject({ entry: 'foreign-dna', kind: 'dna', replaced: 'thermophile' });
    expect(event.amount?.gt(0)).toBe(true);
    expect(
      drawFind(complete, 'arrival', null, params, NEUTRAL_MODIFIERS).state.finds,
    ).toMatchObject({
      total: 2,
      collected: { thermophile: 3 },
    });

    const collectible = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'pyrite', r2));
    const [, , r3] = triple(collectible);
    const twice = found(at('vent', collectible, { collected: { pyrite: 1 } }));
    expect(twice).toMatchObject({ entry: 'foreign-dna', replaced: 'pyrite' });
    // Dasselbe `u_F` wie ein direkter DNA-Fund: 20^0,8 · u_F bei z = 0.
    expect(twice.amount?.toNumber()).toBeCloseTo(20 ** 0.8 * (0.8 + 0.4 * r3), 10);
  });

  it('sammelt Objekte und meldet das Badge beim vollständigen Set', () => {
    const rngState = rngWhere(([r1, r2]) => r1 < 0.2 && drawsEntry('vent', 'magnetite', r2));
    expect(found(at('vent', rngState))).toMatchObject({ kind: 'collectible', badge: null });
    const event = found(at('vent', rngState, { collected: { pyrite: 1, 'basalt-pebble': 1 } }));
    expect(event).toMatchObject({ entry: 'magnetite', badge: 'deep-stones' });
  });

  it('erkennt erreichte Ziele nur bei Fragmenten und Sammelobjekten', () => {
    const finds: Finds = { ...initial.finds, collected: { 'sulfur-pearl': 5, pumice: 1 } };
    const reached = (id: FindEntryId): boolean =>
      isFindTargetReached(
        finds,
        FIND_ENTRIES_BY_SITE.vent
          .concat(FIND_ENTRIES_BY_SITE['algal-mat'])
          .find((entry) => entry.id === id) ?? FIND_ENTRIES_BY_SITE.vent[0],
        params,
      );
    expect(reached('sulfur-pearl')).toBe(true);
    expect(reached('thermophile')).toBe(false);
    expect(reached('pumice')).toBe(true);
    expect(reached('foam-ball')).toBe(false);
    expect(reached('foreign-dna')).toBe(false);
    expect(reached('plankton-bloom')).toBe(false);
  });
});

describe('Buffs', () => {
  const finds: Finds = {
    ...initialFinds('buffs'),
    buffs: [
      { id: 'plankton-bloom', expiresAtMs: 5_000 },
      { id: 'warm-current', expiresAtMs: 9_000 },
    ],
  };

  it('wirken nur, solange `expiresAtMs > time.played`', () => {
    expect(buffEffects(finds, 4_999, DEFAULT_BALANCE)).toEqual([
      { target: 'collectRate', op: 'mul', value: 1.5 },
      { target: 'broodRate', op: 'mul', value: 1.5 },
    ]);
    expect(buffEffects(finds, 5_000, DEFAULT_BALANCE)).toEqual([
      { target: 'broodRate', op: 'mul', value: 1.5 },
    ]);
    expect(buffEffects(finds, 9_000, DEFAULT_BALANCE)).toEqual([]);
  });

  it('nennt den nächsten Ablauf eines laufenden Buffs', () => {
    expect(nextBuffExpiryMs(finds, 0)).toBe(5_000);
    expect(nextBuffExpiryMs(finds, 5_000)).toBe(9_000);
    expect(nextBuffExpiryMs(finds, 9_000)).toBeNull();
  });

  it('entfernt abgelaufene Einträge und lässt sonst den Zustand', () => {
    const base = createInitialState({ seed: 'buffs', now: 0 });
    const state: GameState = { ...base, finds, time: { ...base.time, played: 5_000 } };
    expect(pruneBuffs(state).finds.buffs).toEqual([{ id: 'warm-current', expiresAtMs: 9_000 }]);
    const early = { ...state, time: { ...state.time, played: 1_000 } };
    expect(pruneBuffs(early)).toBe(early);
  });
});

describe('nextHarvestThreshold', () => {
  const base = createInitialState({ seed: 'schwellen', now: 0 });

  it('nennt Schwelle, Vorrat und Zeit bei konstanter Abbaurate', () => {
    // Startzustand: G = 20.000, nur Grundertrag 1,5 Nahrung/s.
    const next = nextHarvestThreshold(base, DEFAULT_BALANCE, NEUTRAL_MODIFIERS);
    expect(next?.threshold).toBe(1);
    expect(next?.stock.eq(15_000)).toBe(true);
    expect(next?.msLeft).toBeCloseTo((5_000 / 1.5) * 1000, 6);
    const half = { ...base, site: { ...base.site, stock: Num.from(10_000) } };
    expect(nextHarvestThreshold(half, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)?.threshold).toBe(3);
  });

  it('gibt es nicht während einer Reise, ohne Vorrat oder ohne Schwellen', () => {
    const empty = { ...base, site: { ...base.site, stock: Num.ZERO } };
    expect(nextHarvestThreshold(empty, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBeNull();
    const none = { ...DEFAULT_BALANCE, findHarvestDraws: 0 };
    expect(nextHarvestThreshold(base, none, NEUTRAL_MODIFIERS)).toBeNull();
    const traveling = { ...base, travel: { target: base.map.candidates[0], remainingMs: 1 } };
    expect(nextHarvestThreshold(traveling, DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBeNull();
  });
});
