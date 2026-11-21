import { Num } from '../num/num';
import { barPercent, formatDown, formatDuration, formatUp, splitPercents } from './display-format';

describe('display-format', () => {
  it('rundet Mengen ab und Preise auf', () => {
    expect(formatDown(Num.from(10.9))).toBe('10');
    expect(formatUp(Num.from(10.1))).toBe('11');
    expect(formatDown(Num.from(0.9))).toBe('0');
    expect(formatUp(Num.from(0.1))).toBe('1');
    expect(formatUp(Num.from(12))).toBe('12');
  });

  it('rundet auch in den Kurzformen gerichtet', () => {
    expect(formatDown(Num.from(1_999_999))).toBe('1,99 Mio.');
    expect(formatUp(Num.from(1_990_001))).toBe('2,00 Mio.');
    expect(formatUp(Num.from(2_000_000))).toBe('2,00 Mio.');
    expect(formatDown(Num.from('1.2399e10'))).toBe('12,39 Mrd.');
  });

  it('nimmt beim Aufrunden den Übertrag in die nächste Einheit mit', () => {
    expect(formatUp(Num.from(999_999.5))).toBe('1,00 Mio.');
    expect(formatUp(Num.from('9.99999e8'))).toBe('1,00 Mrd.');
    expect(formatUp(Num.from('9.999991e23'))).toBe('1,00e24');
  });

  it('rundet in wissenschaftlicher Notation gerichtet', () => {
    expect(formatDown(Num.from('1.239e30'))).toBe('1,23e30');
    expect(formatUp(Num.from('1.231e30'))).toBe('1,24e30');
  });

  it('rundet gerichtet auf die Stellen der gewählten Notation', () => {
    const value = Num.from('1.23999e10');
    expect(formatDown(value, { notation: 'short' })).toBe('12,39 Mrd.');
    expect(formatDown(value, { notation: 'scientific' })).toBe('1,23e10');
    expect(formatUp(value, { notation: 'scientific' })).toBe('1,24e10');
    expect(formatDown(value, { notation: 'engineering' })).toBe('12,39e9');
    expect(formatUp(Num.from('9.99999e8'), { notation: 'engineering' })).toBe('1,00e9');
    // Kurzformen zeigen ab 1e24 nur drei Stellen, technisch weiter bis zu fünf.
    expect(formatDown(Num.from('1.239999e26'), { notation: 'short' })).toBe('1,23e26');
    expect(formatDown(Num.from('1.239999e26'), { notation: 'engineering' })).toBe('123,99e24');
  });

  it.each([
    [0, '0 s'],
    [45, '45 s'],
    [59.5, '1 min 00 s'],
    [750, '12 min 30 s'],
    [2000, '33 min 20 s'],
    [3600, '1 h 00 min'],
    [7500, '2 h 05 min'],
    [3_600_000, '1.000 h 00 min'],
  ])('formatiert %d Sekunden als %s', (seconds, expected) => {
    expect(formatDuration(Num.from(seconds))).toBe(expected);
  });

  it('zeigt bei riesigen Restzeiten nur noch Stunden', () => {
    expect(formatDuration(Num.from('3.6e30'))).toBe('1,00e27 h');
  });

  it('begrenzt Balkenwerte auf 0 bis 100', () => {
    expect(barPercent(0.5)).toBe(50);
    expect(barPercent(1.05)).toBe(100);
    expect(barPercent('1e400')).toBe(100);
    expect(barPercent(0)).toBe(0);
  });

  describe('splitPercents', () => {
    it('teilt in ganze Prozent mit Summe 100', () => {
      expect(splitPercents([3, 1])).toEqual([75, 25]);
      expect(splitPercents([1, 2])).toEqual([33, 67]);
      expect(splitPercents([1, 1, 1])).toEqual([33, 33, 34]);
    });

    it('gibt den Rundungsrest an den letzten Eintrag', () => {
      // 12,5 % und 87,5 %: einzeln gerundet wären es 13 % und 88 %.
      expect(splitPercents([1, 7])).toEqual([13, 87]);
    });

    it('liefert nur Nullen, wenn die Summe 0 ist', () => {
      expect(splitPercents([0, 0])).toEqual([0, 0]);
      expect(splitPercents([])).toEqual([]);
    });

    it('kommt mit einem einzelnen Eintrag aus', () => {
      expect(splitPercents([4])).toEqual([100]);
    });
  });
});
