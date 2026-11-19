import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { isValidEffect } from '@app/balance/domain/effects-logic';
import { BADGE_PARAMS, FIND_ENTRY_PARAMS, findEntryWeight } from '@app/balance/domain/formulas';
import { UNIQUE_ADAPTATION_BY_ID } from '@app/genome/domain/data/genome-era1.data';
import { SITE_TYPE_IDS } from '@app/site/domain/data/sites-era1.data';

import { badgeEffects } from '../collection-logic';
import { buffEffects } from '../finds-logic';
import {
  BUFF_IDS,
  COLLECTIBLE_IDS,
  COLLECTION_SET_IDS,
  FIND_ENTRY_IDS,
  FRAGMENT_IDS,
  Finds,
} from '../models/finds.model';
import {
  COLLECTION_SETS,
  FIND_ENTRIES,
  FIND_ENTRIES_BY_SITE,
  FIND_ENTRY_BY_ID,
  FRAGMENT_ADAPTATIONS,
} from './finds-era1.data';

describe('Fund-Daten Ära I (Game-Design §4.16, §4.17)', () => {
  it('enthält genau die stabilen IDs in Ziehungsreihenfolge, jede einmal', () => {
    expect(FIND_ENTRIES.map((entry) => entry.id)).toEqual([...FIND_ENTRY_IDS]);
    expect(new Set(FIND_ENTRY_IDS).size).toBe(FIND_ENTRY_IDS.length);
    expect(FIND_ENTRIES.filter((entry) => entry.kind === 'buff').map((entry) => entry.id)).toEqual([
      ...BUFF_IDS,
    ]);
    expect(
      FIND_ENTRIES.filter((entry) => entry.kind === 'fragment').map((entry) => entry.id),
    ).toEqual([...FRAGMENT_IDS]);
    expect(
      FIND_ENTRIES.filter((entry) => entry.kind === 'collectible').map((entry) => entry.id),
    ).toEqual([...COLLECTIBLE_IDS]);
    expect(Object.keys(FIND_ENTRY_PARAMS)).toEqual([...FIND_ENTRY_IDS]);
  });

  it('ordnet jedes Sammelobjekt genau einem Set mit drei Objekten zu', () => {
    expect(COLLECTION_SETS.map((set) => set.id)).toEqual([...COLLECTION_SET_IDS]);
    expect(COLLECTION_SETS.flatMap((set) => set.items)).toEqual([...COLLECTIBLE_IDS]);
    for (const set of COLLECTION_SETS) {
      expect(set.items).toHaveLength(3);
      for (const item of set.items) {
        expect(FIND_ENTRY_BY_ID[item]).toMatchObject({ kind: 'collectible', set: set.id });
        expect(FIND_ENTRY_BY_ID[item].sites).toEqual(set.sites);
      }
    }
    expect(Object.keys(BADGE_PARAMS)).toEqual([...COLLECTION_SET_IDS]);
  });

  it('ordnet jedem Fragment die einzigartige Adaption der Genom-Daten zu', () => {
    for (const id of FRAGMENT_IDS) {
      expect(UNIQUE_ADAPTATION_BY_ID[FRAGMENT_ADAPTATIONS[id]].fragment).toBe(id);
    }
  });

  it('hat für jede Zahl einen Schlüssel in BalanceParams', () => {
    for (const keys of Object.values(FIND_ENTRY_PARAMS)) {
      for (const key of Object.values(keys)) {
        expect(DEFAULT_BALANCE).toHaveProperty(key);
      }
    }
    for (const { effect } of Object.values(BADGE_PARAMS)) {
      expect(DEFAULT_BALANCE).toHaveProperty(effect);
    }
  });

  it('ergibt die Summen der Gewichte je Typ aus der Tabelle (v1)', () => {
    const sums = SITE_TYPE_IDS.map((type) =>
      FIND_ENTRIES_BY_SITE[type].reduce(
        (sum, entry) => sum + findEntryWeight(entry.id, DEFAULT_BALANCE),
        0,
      ),
    );
    expect(sums).toEqual([89, 94, 89, 94, 89]);
    for (const type of SITE_TYPE_IDS) {
      expect(FIND_ENTRIES_BY_SITE[type][0].id).toBe('foreign-dna');
      expect(
        FIND_ENTRIES_BY_SITE[type].filter((entry) => entry.kind === 'collectible'),
      ).toHaveLength(6);
    }
  });

  it('erfüllt mit den Standardwerten die Datenregel der Effekte', () => {
    const everything: Finds = {
      rngState: 0,
      total: 0,
      collected: Object.fromEntries(COLLECTIBLE_IDS.map((id) => [id, 1])),
      buffs: BUFF_IDS.map((id) => ({ id, expiresAtMs: 1 })),
    };
    const effects = [
      ...buffEffects(everything, 0, DEFAULT_BALANCE),
      ...badgeEffects(everything, DEFAULT_BALANCE),
    ];
    expect(effects).toHaveLength(BUFF_IDS.length + COLLECTION_SET_IDS.length);
    for (const effect of effects) {
      expect(isValidEffect(effect)).toBe(true);
    }
    // Buffs wirken nur auf collectRate, broodRate und findChance, immer als `mul` (§4.13).
    for (const effect of buffEffects(everything, 0, DEFAULT_BALANCE)) {
      expect(['collectRate', 'broodRate', 'findChance']).toContain(effect.target);
      expect(effect.op).toBe('mul');
    }
  });
});
