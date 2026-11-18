import { isSiteTypeId, SITE_TYPE_IDS, SITE_TYPES_ERA1, START_SITE_TYPE } from './sites-era1.data';

describe('Futterstellentypen', () => {
  it('hält die stabile ID der ersten Futterstelle fest', () => {
    expect(SITE_TYPE_IDS).toEqual(['vent']);
    expect(START_SITE_TYPE).toBe('vent');
    expect(SITE_TYPES_ERA1.map(({ id }) => id)).toEqual(['vent']);
  });

  it('erkennt nur bekannte IDs', () => {
    expect(isSiteTypeId('vent')).toBe(true);
    expect(isSiteTypeId('schlot')).toBe(false);
    expect(isSiteTypeId('constructor')).toBe(false);
    expect(isSiteTypeId(undefined)).toBe(false);
  });
});
