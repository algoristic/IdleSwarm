import { parseWholeCount } from './sacrifice-count-logic';

describe('parseWholeCount', () => {
  it('liest ganze Zahlen, auch mit Tausenderpunkt und Leerraum', () => {
    expect(parseWholeCount('0')).toBe(0);
    expect(parseWholeCount(' 12 ')).toBe(12);
    expect(parseWholeCount('1.000')).toBe(1000);
    expect(parseWholeCount('12.345.678')).toBe(12_345_678);
  });

  it('lehnt Bruchteile, Vorzeichen und andere Schreibweisen ab', () => {
    for (const text of [
      '',
      ' ',
      '1,5',
      '1.5',
      '1.00',
      '-3',
      '+3',
      '1e3',
      '0x10',
      'zwölf',
      '1 000',
    ]) {
      expect(parseWholeCount(text)).toBeNull();
    }
  });
});
