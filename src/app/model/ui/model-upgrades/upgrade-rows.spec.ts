import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';

import type { UpgradeRow } from '../../domain/upgrade-logic';
import { upgradeRowViews } from './upgrade-rows';

const base: UpgradeRow = {
  id: 'cilia-1',
  kind: 'node',
  currency: 'dna',
  cost: 8,
  owned: true,
  effects: [{ target: 'collectRate', before: 0.2, after: 0.24 }],
  foodGainPerSecond: 0.4,
  foodGainShare: 0.1,
  paybackMs: null,
};

describe('upgradeRowViews', () => {
  it('zeigt Sammelleistung als Prozent der Grundrate und fehlende Amortisation als Strich', () => {
    const [view] = upgradeRowViews([base], BALANCE_V1);
    expect(view).toMatchObject({
      label: 'Cilien-Schlag I',
      status: 'entwickelt',
      cost: '8 DNA',
      effects: ['Sammelleistung je Drohne: 100 % → 120 %'],
      foodGain: '0,4',
      payback: '–',
    });
  });

  it('zeigt Freischaltungen, Einheiten und Amortisation in Nahrung', () => {
    const rows: UpgradeRow[] = [
      {
        ...base,
        id: 'autophagy',
        effects: [{ target: 'fallenRecycling', before: false, after: true }],
      },
      {
        ...base,
        id: 'drones',
        kind: 'unit',
        currency: 'food',
        owned: false,
        effects: [{ target: 'foodPerSecond', before: 3.5, after: 3.7 }],
        paybackMs: 90_000,
      },
    ];
    const [autophagy, drones] = upgradeRowViews(rows, BALANCE_V1);
    expect(autophagy.effects).toEqual(['Gefallene werden zu Nahrung: nein → ja']);
    expect(drones).toMatchObject({ label: 'Drohne', status: '–', payback: '1 min 30 s' });
    expect(drones.effects).toEqual(['Nahrung/s: 3,5 → 3,7']);
  });
});
