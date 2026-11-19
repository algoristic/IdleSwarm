import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { combineEffects } from '@app/balance/domain/effects-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import type { Finds } from '@app/finds/domain/models/finds.model';
import { Num } from '@app/shared/util/num/num';

import {
  availableNodeCount,
  canEvolve,
  evolve,
  fragmentProgress,
  genomeEffects,
  isUniqueAdaptationUnlocked,
  nodeCost,
  nodeEffectPreview,
  nodeStatus,
  uniqueAdaptationStatus,
} from './genome-logic';
import type { GenomeNodeId } from './models/genome.model';

const params = DEFAULT_BALANCE;
const initial = Object.freeze(createInitialState({ seed: 'genom', now: 1000 }));

function withGenome(dna: number, owned: readonly GenomeNodeId[] = []): GameState {
  return Object.freeze({
    ...initial,
    res: Object.freeze({ ...initial.res, dna: Num.from(dna) }),
    genome: Object.freeze({ owned: Object.freeze([...owned]) }),
  });
}

function withFragments(collected: Finds['collected']): Finds {
  return { ...initial.finds, collected };
}

const modifiersOf = (state: GameState) => stateModifiers(state, params);

describe('nodeStatus (Game-Design §4.14, US-05.02)', () => {
  it('unterscheidet verfügbar, zu teuer und gesperrt', () => {
    const state = withGenome(10);
    expect(nodeStatus(state, 'cilia-1', params)).toBe('available');
    expect(nodeStatus(state, 'cilia-2', params)).toBe('locked');
    expect(nodeStatus(withGenome(7), 'cilia-1', params)).toBe('too-expensive');
    expect(nodeStatus(withGenome(10, ['cilia-1']), 'cilia-2', params)).toBe('too-expensive');
    expect(nodeStatus(withGenome(25, ['cilia-1']), 'cilia-2', params)).toBe('available');
  });

  it('meldet entwickelte Knoten unabhängig von der DNA', () => {
    expect(nodeStatus(withGenome(0, ['cilia-1']), 'cilia-1', params)).toBe('evolved');
  });
});

describe('availableNodeCount (US-05.04)', () => {
  it('zählt nur bezahlbare Knoten mit entwickeltem Vorgänger', () => {
    expect(availableNodeCount(withGenome(0), params)).toBe(0);
    expect(availableNodeCount(withGenome(8), params)).toBe(3);
    expect(availableNodeCount(withGenome(25, ['cilia-1']), params)).toBe(3);
    expect(availableNodeCount(withGenome(24, ['cilia-1']), params)).toBe(2);
  });
});

describe('evolve (Game-Design §4.14)', () => {
  it('zieht die Kosten ab und trägt den Knoten ein', () => {
    const state = withGenome(30, ['cilia-1']);
    expect(canEvolve(state, 'cilia-2', params)).toBe(true);
    const next = evolve(state, 'cilia-2', params).state;
    expect(next.res.dna.eq(5)).toBe(true);
    expect(next.genome.owned).toEqual(['cilia-1', 'cilia-2']);
    expect(state.genome.owned).toEqual(['cilia-1']);
  });

  it('meldet den Kauf mit Knoten, Kosten und Spielzeit', () => {
    const state: GameState = Object.freeze({
      ...withGenome(80, ['cilia-1', 'cilia-2']),
      time: { ...initial.time, played: 12_345 },
    });
    const { events } = evolve(state, 'filter-feeder', params);
    expect(events).toHaveLength(1);
    const [event] = events;
    expect(event.type).toBe('evolved');
    expect(event.node).toBe('filter-feeder');
    expect(event.playedMs).toBe(12_345);
    expect(event.cost.toNumber()).toBe(80);
    expect(evolve(withGenome(0), 'cilia-1', params).events).toEqual([]);
  });

  it('hält `owned` in der Reihenfolge der Spieldaten (Game-Design §5.1)', () => {
    const next = evolve(withGenome(8, ['acid-vacuole']), 'cilia-1', params).state;
    expect(next.genome.owned).toEqual(['cilia-1', 'acid-vacuole']);
  });

  it('bleibt ohne Wirkung bei zu wenig DNA, fehlendem Vorgänger oder schon entwickeltem Knoten', () => {
    const poor = withGenome(7);
    expect(evolve(poor, 'cilia-1', params).state).toBe(poor);
    const locked = withGenome(1000);
    expect(canEvolve(locked, 'cilia-2', params)).toBe(false);
    expect(evolve(locked, 'cilia-2', params).state).toBe(locked);
    const owned = withGenome(1000, ['cilia-1']);
    expect(evolve(owned, 'cilia-1', params).state).toBe(owned);
  });

  it('wirkt auch während einer Reise', () => {
    const traveling: GameState = Object.freeze({
      ...withGenome(8),
      travel: { target: initial.map.candidates[0], remainingMs: 5000 },
    });
    const next = evolve(traveling, 'acid-vacuole', params).state;
    expect(next.genome.owned).toEqual(['acid-vacuole']);
    expect(next.res.dna.isZero()).toBe(true);
    expect(next.travel).toBe(traveling.travel);
  });

  it('rechnet mit den Kosten aus `params`', () => {
    const cheap = { ...params, genomeCost: 2 };
    expect(nodeCost('flagellum', cheap).toNumber()).toBe(200);
    expect(canEvolve(withGenome(2), 'cilia-1', cheap)).toBe(true);
  });
});

describe('einzigartige Adaptionen (Game-Design §4.14)', () => {
  it('wirken erst mit allen Fragmenten, ohne DNA und ohne Kauf', () => {
    const partial = withFragments({ 'sulfur-pearl': 4 });
    expect(isUniqueAdaptationUnlocked(partial, 'sulfur-shell', params)).toBe(false);
    expect(uniqueAdaptationStatus(partial, 'sulfur-shell', params)).toBe('undiscovered');
    expect(fragmentProgress(partial, 'sulfur-shell', params)).toEqual({ found: 4, required: 5 });
    expect(genomeEffects(initial.genome, partial, params)).toEqual([]);

    const complete = withFragments({ 'sulfur-pearl': 5 });
    expect(uniqueAdaptationStatus(complete, 'sulfur-shell', params)).toBe('evolved');
    expect(genomeEffects(initial.genome, complete, params)).toEqual([
      { target: 'attackPerSoldier', op: 'add', value: 1 },
    ]);
  });

  it('begrenzt den Fortschritt auf die benötigte Zahl', () => {
    const extra = withFragments({ chloroplast: 7 });
    expect(fragmentProgress(extra, 'algal-symbiosis', params)).toEqual({ found: 2, required: 2 });
    expect(fragmentProgress(initial.finds, 'algal-symbiosis', params)).toEqual({
      found: 0,
      required: 2,
    });
  });

  it('nimmt die benötigten Fragmente aus `params`', () => {
    const finds = withFragments({ 'primal-crystal': 1 });
    expect(isUniqueAdaptationUnlocked(finds, 'crystal-sense', params)).toBe(false);
    expect(
      isUniqueAdaptationUnlocked(finds, 'crystal-sense', { ...params, crystalSenseFragments: 1 }),
    ).toBe(true);
  });
});

describe('genomeEffects', () => {
  it('nimmt die Effektwerte aus `params`', () => {
    const effects = genomeEffects({ owned: ['cilia-1'] }, initial.finds, {
      ...params,
      cilia1Effect: 0.7,
    });
    expect(effects).toEqual([{ target: 'collectRate', op: 'add', value: 0.7 }]);
  });

  it('liefert Beispiel 9 ohne und mit Planktonblüte (Game-Design §4.13)', () => {
    const effects = genomeEffects(
      { owned: ['cilia-1', 'cilia-2', 'filter-feeder', 'chemotaxis', 'flagellum'] },
      withFragments({ thermophile: 3 }),
      params,
    );
    const bloom = { target: 'collectRate', op: 'mul', value: 1.5 } as const;
    const vent = combineEffects([...effects, bloom], 'vent');
    const mat = combineEffects([...effects, bloom], 'algal-mat');
    expect((1 + vent.collectRate.add) * vent.collectRate.mul).toBeCloseTo(3.9375, 12);
    expect((1 + mat.collectRate.add) * mat.collectRate.mul).toBeCloseTo(3.375, 12);
  });
});

describe('nodeEffectPreview (US-05.02)', () => {
  it('zeigt den betroffenen Wert vorher und nachher', () => {
    const state = withGenome(1000, ['cilia-1', 'cilia-2', 'filter-feeder']);
    expect(nodeEffectPreview(state, 'chemotaxis', params, modifiersOf)).toEqual([
      { target: 'range', before: 5, after: 6 },
    ]);
    const acid = nodeEffectPreview(withGenome(8), 'acid-vacuole', params, modifiersOf);
    expect(acid).toEqual([{ target: 'attackPerSoldier', before: 1, after: 1.2 }]);
  });

  it('zeigt alle Effekte eines Knotens, auch Freischaltungen', () => {
    const preview = nodeEffectPreview(
      withGenome(25, ['acid-vacuole']),
      'autophagy',
      params,
      modifiersOf,
    );
    expect(preview).toHaveLength(2);
    expect(preview[0].target).toBe('sacrificeYield');
    expect(preview[0].before).toBeCloseTo(0.5, 12);
    expect(preview[0].after).toBeCloseTo(0.7, 12);
    expect(preview[1]).toEqual({ target: 'fallenRecycling', before: false, after: true });
  });

  it('rechnet einen schon entwickelten Knoten heraus und andere Quellen ein', () => {
    const state = Object.freeze({
      ...withGenome(0, ['acid-vacuole']),
      finds: withFragments({ 'sulfur-pearl': 5 }),
    });
    const [preview] = nodeEffectPreview(state, 'acid-vacuole', params, modifiersOf);
    expect(preview.target).toBe('attackPerSoldier');
    expect(preview.before).toBeCloseTo(2, 12);
    expect(preview.after).toBeCloseTo(2.2, 12);
  });

  it('zeigt Eier/min je Königin und Platz je Königin', () => {
    const owned: GenomeNodeId[] = ['yolk-reserve', 'brood-combs', 'second-gland', 'nurse-cells'];
    const state = withGenome(1000, owned);
    const [eggs] = nodeEffectPreview(withGenome(8), 'yolk-reserve', params, modifiersOf);
    expect(eggs.before).toBeCloseTo(6, 12);
    expect(eggs.after).toBeCloseTo(7.2, 12);
    expect(nodeEffectPreview(state, 'budding', params, modifiersOf)).toEqual([
      { target: 'spacePerQueen', before: 12, after: 15 },
    ]);
  });
});
