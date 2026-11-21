import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { isValidEffect } from '@app/balance/domain/effects-logic';
import {
  GENOME_NODE_PARAMS,
  genomeNodeCost,
  UNIQUE_ADAPTATION_PARAMS,
} from '@app/balance/domain/formulas';
import { FRAGMENT_IDS } from '@app/finds/domain/models/finds.model';

import { nodeCost, nodeEffects, uniqueAdaptationEffects } from '../genome-logic';
import {
  GENOME_NODE_IDS,
  GENOME_ROOT,
  GENOME_TIERS,
  UNIQUE_ADAPTATION_IDS,
} from '../models/genome.model';
import {
  GENOME_NODE_BY_ID,
  GENOME_NODE_PREDECESSORS,
  GENOME_NODES,
  UNIQUE_ADAPTATIONS,
} from './genome-era1.data';

describe('Genom-Daten Ära I (Game-Design §4.14)', () => {
  it('enthält genau die stabilen IDs in ihrer Reihenfolge', () => {
    expect(GENOME_NODES.map((node) => node.id)).toEqual([...GENOME_NODE_IDS]);
    expect(UNIQUE_ADAPTATIONS.map((adaptation) => adaptation.id)).toEqual([
      ...UNIQUE_ADAPTATION_IDS,
    ]);
    expect(new Set(GENOME_NODE_IDS).size).toBe(GENOME_NODE_IDS.length);
    expect(new Set(UNIQUE_ADAPTATION_IDS).size).toBe(UNIQUE_ADAPTATION_IDS.length);
  });

  it('ordnet jedem Fragment genau eine einzigartige Adaption zu', () => {
    const fragments = UNIQUE_ADAPTATIONS.map((adaptation) => adaptation.fragment);
    expect([...fragments].sort()).toEqual([...FRAGMENT_IDS].sort());
  });

  it('hängt die erste Stufe an die Wurzel und jede weitere an die vorige Stufe desselben Asts', () => {
    for (const node of GENOME_NODES) {
      if (node.tier === 1) {
        expect(node.predecessor).toBe(GENOME_ROOT);
      } else {
        expect(node.predecessor).not.toBe(GENOME_ROOT);
        const predecessor = GENOME_NODE_BY_ID[node.predecessor as keyof typeof GENOME_NODE_BY_ID];
        expect(predecessor.branch).toBe(node.branch);
        expect(predecessor.tier).toBe(node.tier - 1);
      }
      expect(GENOME_NODE_PREDECESSORS[node.id]).toBe(node.predecessor);
    }
  });

  it('hat drei Äste mit je fünf Stufen', () => {
    for (const branch of ['collect', 'brood', 'combat'] as const) {
      const tiers = GENOME_NODES.filter((node) => node.branch === branch).map((node) => node.tier);
      expect(tiers).toEqual([...GENOME_TIERS]);
    }
  });

  it('verankert einzigartige Adaptionen an regulären Knoten', () => {
    for (const adaptation of UNIQUE_ADAPTATIONS) {
      expect(GENOME_NODE_IDS).toContain(adaptation.anchor);
    }
  });

  it('hat je Quelle höchstens einen Effekt mit Zahl und dafür einen Schlüssel', () => {
    for (const node of GENOME_NODES) {
      expect(node.effects.filter((effect) => effect.op !== 'unlock')).toHaveLength(1);
      expect(DEFAULT_BALANCE).toHaveProperty(GENOME_NODE_PARAMS[node.id].effect);
    }
    for (const adaptation of UNIQUE_ADAPTATIONS) {
      expect(adaptation.effects.filter((effect) => effect.op !== 'unlock')).toHaveLength(1);
      const keys = UNIQUE_ADAPTATION_PARAMS[adaptation.id];
      expect(DEFAULT_BALANCE).toHaveProperty(keys.effect);
      expect(Number.isInteger(DEFAULT_BALANCE[keys.fragments])).toBe(true);
      expect(DEFAULT_BALANCE[keys.fragments]).toBeGreaterThanOrEqual(1);
    }
  });

  it('erfüllt mit den Standardwerten die Datenregel der Effekte', () => {
    const effects = [
      ...GENOME_NODE_IDS.flatMap((id) => nodeEffects(id, DEFAULT_BALANCE)),
      ...UNIQUE_ADAPTATION_IDS.flatMap((id) => uniqueAdaptationEffects(id, DEFAULT_BALANCE)),
    ];
    expect(effects).toHaveLength(GENOME_NODE_IDS.length + UNIQUE_ADAPTATION_IDS.length + 1);
    for (const effect of effects) {
      expect(isValidEffect(effect)).toBe(true);
    }
  });

  it('kostet je Stufe 3, 18, 108, 648 und 3.888 DNA, das ganze Genom 13.995 DNA (Werte v1.5)', () => {
    expect(GENOME_TIERS.map((tier) => genomeNodeCost(tier, DEFAULT_BALANCE).toNumber())).toEqual([
      3, 18, 108, 648, 3888,
    ]);
    const total = GENOME_NODE_IDS.reduce(
      (sum, id) => sum + nodeCost(id, DEFAULT_BALANCE).toNumber(),
      0,
    );
    expect(total).toBe(13995);
  });
});
