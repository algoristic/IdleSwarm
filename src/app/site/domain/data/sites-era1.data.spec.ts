import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { siteFindChance, siteTypeWeight } from '@app/balance/domain/formulas';

import {
  isSiteTypeId,
  SAFE_SITE_TYPE,
  SITE_TYPE_IDS,
  SITE_TYPES_ERA1,
  START_SITE_TYPE,
} from './sites-era1.data';

describe('Futterstellentypen', () => {
  it('hält die stabilen IDs in der Reihenfolge der Typtabelle fest', () => {
    expect(SITE_TYPE_IDS).toEqual([
      'algal-mat',
      'vent',
      'bacterial-mat',
      'methane-seep',
      'whale-fall',
    ]);
    expect(START_SITE_TYPE).toBe('vent');
    expect(SAFE_SITE_TYPE).toBe('algal-mat');
    expect(SITE_TYPES_ERA1.map(({ id }) => id)).toEqual(SITE_TYPE_IDS);
  });

  it('hat für jeden Typ Gewicht und Fundchance in den Parametern', () => {
    for (const id of SITE_TYPE_IDS) {
      expect(siteTypeWeight(id, DEFAULT_BALANCE)).toBeGreaterThan(0);
      expect(siteFindChance(id, DEFAULT_BALANCE)).toBeGreaterThan(0);
    }
  });

  it('erkennt nur bekannte IDs', () => {
    expect(isSiteTypeId('vent')).toBe(true);
    expect(isSiteTypeId('whale-fall')).toBe(true);
    expect(isSiteTypeId('schlot')).toBe(false);
    expect(isSiteTypeId('constructor')).toBe(false);
    expect(isSiteTypeId(undefined)).toBe(false);
  });
});
