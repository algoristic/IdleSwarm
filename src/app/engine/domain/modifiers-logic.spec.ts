import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { modifierFactor, NEUTRAL_MODIFIERS } from '@app/balance/domain/effects-logic';
import {
  attackPerSoldier,
  dronesPerQueen,
  expectedLosses,
  pheromoneBonus,
  recycledFood,
  sacrificeYieldShare,
  spacePerQueen,
  swarmRange,
} from '@app/balance/domain/formulas';
import { GENOME_NODE_IDS, GenomeNodeId } from '@app/genome/domain/models/genome.model';
import { Num } from '@app/shared/util/num/num';
import { candidateInfos } from '@app/site/domain/map-logic';

import { createInitialState } from './game-state-logic';
import type { GameState } from './models/game-state.model';
import { effectSiteType, genomeNodePreview, stateEffects, stateModifiers } from './modifiers-logic';

const params = DEFAULT_BALANCE;

describe('stateModifiers (Game-Design §4.13)', () => {
  const initial = createInitialState({ seed: 'effekte', now: 1000 });

  function withOwned(owned: readonly GenomeNodeId[]): GameState {
    return { ...initial, genome: { owned } };
  }

  it('ist beim Startzustand neutral', () => {
    expect(stateEffects(initial, params)).toEqual([]);
    expect(stateModifiers(initial, params)).toBe(NEUTRAL_MODIFIERS);
  });

  it('prüft Bedingungen gegen die aktuelle Futterstelle, während einer Reise gegen keine', () => {
    expect(effectSiteType(initial)).toBe('vent');
    const traveling: GameState = {
      ...initial,
      travel: { target: initial.map.candidates[0], remainingMs: 1000 },
    };
    expect(effectSiteType(traveling)).toBeNull();
  });

  it('sammelt die Effekte der entwickelten Knoten', () => {
    expect(stateEffects(withOwned(['cilia-1', 'acid-vacuole']), params)).toEqual([
      { target: 'collectRate', op: 'add', value: 0.2 },
      { target: 'attackPerSoldier', op: 'add', value: 0.2 },
    ]);
  });

  it('ergibt mit allen regulären Knoten die Werte aus §4.14', () => {
    const modifiers = stateModifiers(withOwned(GENOME_NODE_IDS), params);
    expect(modifierFactor(modifiers.collectRate)).toBeCloseTo(2.25, 12);
    expect(modifierFactor(modifiers.broodRate)).toBeCloseTo(1.5, 12);
    expect(modifierFactor(modifiers.findChance)).toBeCloseTo(1.25, 12);
    expect(swarmRange(params, modifiers)).toBe(6);
    expect(attackPerSoldier(params, modifiers)).toBeCloseTo(1.7, 12);
    expect(spacePerQueen(params, modifiers)).toBeCloseTo(15, 12);
    expect(modifierFactor(modifiers.combatLoss)).toBeCloseTo(0.45, 12);
    expect(sacrificeYieldShare(params, modifiers)).toBeCloseTo(0.7, 12);
    expect(pheromoneBonus(modifiers)).toBe(1);
    expect(modifiers.fallenRecycling).toBe(true);
  });

  it('rechnet Beispiel 10 (Kampf mit Säurevakuole, Autophagie und Nesselzellen)', () => {
    const modifiers = stateModifiers(
      withOwned(['acid-vacuole', 'autophagy', 'nettle-cells']),
      params,
    );
    const losses = expectedLosses(Num.from(34), Num.from(26), params, modifiers);
    expect(attackPerSoldier(params, modifiers)).toBeCloseTo(1.2, 12);
    expect(losses.toNumber()).toBeCloseTo(5.18, 2);
    expect(recycledFood(losses, params, modifiers).toNumber()).toBeCloseTo(64.7, 1);
  });

  it('rechnet die weiteren Beispiele aus §4.13', () => {
    const autophagy = stateModifiers(withOwned(['acid-vacuole', 'autophagy']), params);
    expect(sacrificeYieldShare(params, autophagy)).toBeCloseTo(0.7, 12);
    expect(dronesPerQueen(initial.bought, params, autophagy)?.toNumber()).toBeCloseTo(8.57, 2);
  });

  it('wirkt einzigartige Adaptionen erst mit allen Fragmenten', () => {
    const partial: GameState = {
      ...initial,
      finds: { ...initial.finds, collected: { thermophile: 2 } },
    };
    expect(stateModifiers(partial, params)).toBe(NEUTRAL_MODIFIERS);
    const complete: GameState = {
      ...initial,
      finds: { ...initial.finds, collected: { thermophile: 3 } },
    };
    expect(modifierFactor(stateModifiers(complete, params).collectRate)).toBeCloseTo(1.25, 12);
    // Thermosynthese gilt nur an Schloten, während einer Reise nicht.
    const traveling: GameState = {
      ...complete,
      travel: { target: initial.map.candidates[0], remainingMs: 1000 },
    };
    expect(modifierFactor(stateModifiers(traveling, params).collectRate)).toBe(1);
  });

  it('nimmt Badges vollständiger Sets und laufende Buffs auf (Game-Design §4.16, §4.17)', () => {
    const badge: GameState = {
      ...initial,
      finds: { ...initial.finds, collected: { pumice: 1, 'foam-ball': 1, 'clay-bead': 1 } },
    };
    expect(modifierFactor(stateModifiers(badge, params).findChance)).toBeCloseTo(1.1, 12);
    const buffed: GameState = {
      ...badge,
      time: { ...badge.time, played: 1000 },
      finds: { ...badge.finds, buffs: [{ id: 'warm-current', expiresAtMs: 1001 }] },
    };
    expect(modifierFactor(stateModifiers(buffed, params).broodRate)).toBe(1.5);
    // Buffs wirken auch unterwegs, nach dem Ablauf nicht mehr.
    const traveling: GameState = {
      ...buffed,
      travel: { target: initial.map.candidates[0], remainingMs: 1000 },
    };
    expect(modifierFactor(stateModifiers(traveling, params).broodRate)).toBe(1.5);
    const expired: GameState = { ...buffed, time: { ...buffed.time, played: 1001 } };
    expect(modifierFactor(stateModifiers(expired, params).broodRate)).toBe(1);
    expect(stateEffects(expired, params)).toEqual([
      { target: 'findChance', op: 'add', value: 0.1 },
    ]);
  });

  it('schaltet einzigartige Adaptionen über die gefundenen Fragmente frei', () => {
    const before: GameState = {
      ...initial,
      finds: { ...initial.finds, collected: { 'sulfur-pearl': 4 } },
    };
    const after: GameState = {
      ...initial,
      finds: { ...initial.finds, collected: { 'sulfur-pearl': 5 } },
    };
    expect(attackPerSoldier(params, stateModifiers(before, params))).toBe(1);
    expect(attackPerSoldier(params, stateModifiers(after, params))).toBe(2);
  });

  it('deckt mit Chemotaxis (R 5 → 6) sofort Ziele auf, auch während einer Reise', () => {
    const candidate = { ...initial.map.candidates[0], position: { x: 5.5, y: 0 } };
    const traveling: GameState = {
      ...withOwned(['cilia-1', 'cilia-2', 'filter-feeder']),
      map: { ...initial.map, candidates: [candidate] },
      travel: { target: initial.map.candidates[1], remainingMs: 1000 },
    };
    const status = (state: GameState) => {
      const modifiers = stateModifiers(state, params);
      const range = swarmRange(params, modifiers);
      return candidateInfos(state.map.candidates, state.map.position, range, params, modifiers)[0]
        .status;
    };
    expect(status(traveling)).toBe('out-of-range');
    const evolved = { ...traveling, genome: { owned: [...traveling.genome.owned, 'chemotaxis'] } };
    expect(status(evolved as GameState)).toBe('in-range');
  });

  it('liefert „vorher → nachher“ eines Knotens mit allen Quellen des Zustands', () => {
    expect(
      genomeNodePreview(withOwned(['cilia-1', 'cilia-2', 'filter-feeder']), 'chemotaxis', params),
    ).toEqual([{ target: 'range', before: 5, after: 6 }]);
  });
});
