import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { NODE_RADIUS, NUCLEUS_RADIUS, TREE_CENTER } from '../../domain/genome-tree-logic';
import type { GenomeNodeId } from '../../domain/models/genome.model';
import type { GenomeEntryId } from '../../ui/models/genome-entry.model';
import { toGenomeView } from './genome.utils';

const params = BALANCE_V1;

describe('toGenomeView', () => {
  const base = createInitialState({ seed: 'genom', now: 0 });

  function state(
    dna: number,
    owned: readonly GenomeNodeId[] = [],
    collected: GameState['finds']['collected'] = {},
  ): GameState {
    return {
      ...base,
      res: { ...base.res, dna: Num.from(dna) },
      genome: { owned },
      finds: { ...base.finds, collected },
    };
  }

  function view(gameState: GameState, selected: GenomeEntryId | null = null) {
    return toGenomeView({ state: gameState, selected }, params);
  }

  function statusOf(gameState: GameState, id: GenomeEntryId) {
    return view(gameState).tree.nodes.find((node) => node.id === id)?.status;
  }

  it('leitet den Status jedes Knotens ab (US-05.02)', () => {
    // Stufe 1 kostet 8, Stufe 2 25 DNA.
    const gameState = state(10, ['cilia-1'], { 'sulfur-pearl': 2, thermophile: 3 });
    expect(statusOf(gameState, 'root')).toBe('evolved');
    expect(statusOf(gameState, 'cilia-1')).toBe('evolved');
    expect(statusOf(gameState, 'cilia-2')).toBe('too-expensive');
    expect(statusOf(gameState, 'filter-feeder')).toBe('locked');
    expect(statusOf(gameState, 'yolk-reserve')).toBe('available');
    expect(statusOf(gameState, 'acid-vacuole')).toBe('available');
    expect(statusOf(gameState, 'sulfur-shell')).toBe('undiscovered');
    expect(statusOf(gameState, 'thermosynthesis')).toBe('evolved');
    expect(view(gameState).tree.nodes).toHaveLength(1 + 15 + 4);
  });

  it('zählt verfügbare Knoten und zeigt die DNA (US-05.04)', () => {
    const result = view(state(30, ['cilia-1']));
    expect(result.dna.eq(30)).toBe(true);
    // cilia-2 (25), yolk-reserve (8), acid-vacuole (8).
    expect(result.availableCount).toBe(3);
    expect(view(state(0)).availableCount).toBe(0);
  });

  it('zeigt Preise nur bei verfügbaren und zu teuren Knoten, Fortschritt nur bei nicht gefundenen', () => {
    const { nodes } = view(state(10, ['cilia-1'], { 'sulfur-pearl': 2, thermophile: 3 })).tree;
    const node = (id: GenomeEntryId) => nodes.find((n) => n.id === id);
    expect(node('cilia-1')?.cost).toBeNull();
    expect(node('cilia-2')?.cost?.eq(25)).toBe(true);
    expect(node('yolk-reserve')?.cost?.eq(8)).toBe(true);
    expect(node('filter-feeder')?.cost).toBeNull();
    expect(node('sulfur-shell')?.progress).toEqual({ found: 2, required: 5 });
    expect(node('thermosynthesis')?.progress).toBeNull();
  });

  it('färbt Äste nach dem Status des Kindes', () => {
    const { edges } = view(state(10, ['cilia-1'])).tree;
    const style = (id: string) => edges.find((edge) => edge.id === id)?.style;
    expect(style('cilia-1')).toBe('evolved');
    expect(style('cilia-2')).toBe('open');
    expect(style('filter-feeder')).toBe('locked');
    expect(style('sulfur-shell')).toBe('locked');
    expect(edges).toHaveLength(15 + 4);
  });

  it('wählt ohne Auswahl den ersten verfügbaren, sonst den ersten zu teuren Knoten, sonst die Wurzel', () => {
    expect(view(state(10, ['cilia-1'])).selected).toBe('yolk-reserve');
    expect(view(state(0)).selected).toBe('cilia-1');
    const all = view(state(0)).tree.nodes.filter((node) => node.kind === 'node');
    const everything = all.map((node) => node.id as GenomeNodeId);
    expect(view(state(0, everything)).selected).toBe('root');
    const chosen = view(state(0), 'sulfur-shell');
    expect(chosen.selected).toBe('sulfur-shell');
    expect(chosen.tree.nodes.filter((node) => node.selected).map((node) => node.id)).toEqual([
      'sulfur-shell',
    ]);
  });

  describe('Detailpanel', () => {
    it('zeigt Effekt vorher → nachher, Voraussetzung und Preis eines regulären Knotens', () => {
      const detail = view(state(300, ['cilia-1', 'cilia-2', 'filter-feeder']), 'chemotaxis').detail;
      expect(detail).toMatchObject({
        kind: 'node',
        id: 'chemotaxis',
        branch: 'collect',
        status: 'available',
        predecessor: { id: 'filter-feeder', evolved: true },
        effects: [{ kind: 'value', target: 'range', format: 'count', before: 5, after: 6 }],
      });
      if (detail.kind === 'node') {
        expect(detail.cost.eq(253)).toBe(true);
        expect(detail.missing.eq(0)).toBe(true);
      }
    });

    it('rechnet Faktoren und die Sammelleistung als Prozent', () => {
      const collect = view(state(0), 'cilia-1').detail;
      expect(collect).toMatchObject({
        status: 'too-expensive',
        predecessor: { id: 'root', evolved: true },
      });
      if (collect.kind === 'node') {
        expect(collect.effects).toHaveLength(1);
        const [effect] = collect.effects;
        expect(effect.kind === 'value' && effect.format).toBe('percent');
        expect(effect.kind === 'value' && effect.before).toBeCloseTo(100);
        expect(effect.kind === 'value' && effect.after).toBeCloseTo(120);
        expect(collect.missing.eq(8)).toBe(true);
      }
      const nettle = view(state(0, ['acid-vacuole', 'autophagy']), 'nettle-cells').detail;
      if (nettle.kind === 'node') {
        const [effect] = nettle.effects;
        expect(effect.kind === 'value' && [effect.before, effect.after]).toEqual([100, 75]);
      }
    });

    it('zeigt Freischaltungen als aus → an und gesperrte Voraussetzungen', () => {
      const detail = view(state(100), 'autophagy').detail;
      expect(detail).toMatchObject({
        status: 'locked',
        predecessor: { id: 'acid-vacuole', evolved: false },
      });
      if (detail.kind === 'node') {
        expect(detail.effects.map((effect) => effect.kind)).toEqual(['value', 'unlock']);
        expect(detail.effects[1]).toEqual({
          kind: 'unlock',
          target: 'fallenRecycling',
          before: false,
          after: true,
        });
      }
    });

    it('zeigt den Fragmentfortschritt und den Effekt einer einzigartigen Adaption (US-06.02)', () => {
      expect(view(state(0, [], { 'sulfur-pearl': 2 }), 'sulfur-shell').detail).toEqual({
        kind: 'unique',
        id: 'sulfur-shell',
        status: 'undiscovered',
        fragment: 'sulfur-pearl',
        progress: { found: 2, required: 5 },
        effects: [
          {
            kind: 'value',
            target: 'attackPerSoldier',
            format: 'rate',
            delta: 1,
            sign: '+',
            siteType: null,
          },
        ],
      });
      const thermo = view(state(0, [], { thermophile: 7 }), 'thermosynthesis').detail;
      expect(thermo).toMatchObject({
        status: 'evolved',
        progress: { found: 3, required: 3 },
        effects: [{ target: 'collectRate', format: 'percent', delta: 25, siteType: 'vent' }],
      });
    });

    it('zeigt die Wurzel', () => {
      expect(view(state(0), 'root').detail).toEqual({ kind: 'root', id: 'root' });
    });
  });

  it('legt alle Knoten in den Zellkern', () => {
    for (const node of view(state(0)).tree.nodes) {
      const match = /translate\(([\d.]+) ([\d.]+)\)/.exec(node.translate);
      const [x, y] = [Number(match?.[1]), Number(match?.[2])];
      expect(Math.hypot(x - TREE_CENTER, y - TREE_CENTER) + NODE_RADIUS).toBeLessThan(
        NUCLEUS_RADIUS,
      );
    }
  });
});
