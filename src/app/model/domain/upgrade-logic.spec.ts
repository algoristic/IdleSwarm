import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { upgradeTable } from './upgrade-logic';

const params = DEFAULT_BALANCE;

function reference(): GameState {
  const state = createInitialState({ seed: 'upgrade', now: 0 }, params);
  // 1 Königin, 10 Drohnen; `cilia-1` entwickelt.
  return {
    ...state,
    units: { ...state.units, drones: Num.from(10) },
    genome: { owned: ['cilia-1'] },
  };
}

describe('upgradeTable (US-10.07)', () => {
  const rows = upgradeTable(reference(), params);
  const row = (id: string) => rows.find((entry) => entry.id === id);

  it('listet alle Knoten, die einzigartigen Adaptionen, Drüsenpunkt, Königin und Drohne', () => {
    expect(rows).toHaveLength(15 + 4 + 3);
    expect(rows.slice(-3).map((entry) => entry.id)).toEqual(['gland', 'queens', 'drones']);
    expect(row('cilia-1')).toMatchObject({ kind: 'node', currency: 'dna', cost: 8, owned: true });
    expect(row('cilia-2')).toMatchObject({ cost: 25, owned: false });
    expect(row('thermosynthesis')).toMatchObject({
      kind: 'unique',
      currency: 'fragments',
      owned: false,
    });
  });

  it('bewertet einen Sammel-Knoten über die zusätzliche Nahrung/s, ohne Amortisation in DNA', () => {
    // +20 % Sammelleistung: 10 Drohnen · 0,2 · 0,2 = 0,4 Nahrung/s auf 1,5 + 2,0 = 3,5.
    const cilia = row('cilia-1');
    expect(cilia?.foodGainPerSecond).toBeCloseTo(0.4, 10);
    expect(cilia?.foodGainShare).toBeCloseTo(0.4 / 3.5, 10);
    expect(cilia?.paybackMs).toBeNull();
    expect(cilia?.effects).toEqual([{ target: 'collectRate', before: 0.2, after: 0.24 }]);
  });

  it('zeigt bei Knoten ohne Nahrungsertrag nur die Wirkung', () => {
    const chemotaxis = row('chemotaxis');
    expect(chemotaxis?.foodGainPerSecond).toBe(0);
    expect(chemotaxis?.effects[0]).toMatchObject({ target: 'range' });
  });

  it('rechnet die Amortisation der Drohne als Preis ÷ Sammelleistung', () => {
    // Preis 10 (ungekauft), Sammelleistung 0,24 mit `cilia-1`: 41,67 s.
    const drones = row('drones');
    expect(drones).toMatchObject({ currency: 'food', cost: 10 });
    // 0,24 auf 1,5 + 10 · 0,24 = 3,9 Nahrung/s.
    expect(drones?.foodGainShare).toBeCloseTo(0.24 / 3.9, 10);
    expect(row('queens')?.foodGainShare).toBeNull();
    expect(drones?.paybackMs).toBeCloseTo((10 / 0.24) * 1000, 6);
  });

  it('bewertet den Drüsenpunkt in Nahrung mit Pheromonpunkten und Eiern/min', () => {
    const gland = row('gland');
    expect(gland).toMatchObject({ currency: 'food', cost: 100, owned: false });
    expect(gland?.effects.map((effect) => effect.target)).toEqual([
      'pheromonePoints',
      'eggsPerMinute',
    ]);
    const [points] = gland?.effects ?? [];
    expect(points.after).toBe(Number(points.before) + 1);
  });
});
