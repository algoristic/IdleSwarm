import { Num } from '../num/num';
import { formatNum, formatRate } from './format';

describe('formatNum', () => {
  it.each<[number | string, string]>([
    [0, '0'],
    [7, '7'],
    [999, '999'],
    [1000, '1.000'],
    [1284, '1.284'],
    [12345, '12.345'],
    [999999, '999.999'],
  ])('zeigt %s unter 1e6 als ganze Zahl', (value, expected) => {
    expect(formatNum(value)).toBe(expected);
  });

  it.each<[number | string, string]>([
    [1e6, '1,00 Mio.'],
    [1.23e6, '1,23 Mio.'],
    [12.3e6, '12,30 Mio.'],
    [123.4e6, '123,40 Mio.'],
    [999.99e6, '999,99 Mio.'],
    [1e9, '1,00 Mrd.'],
    [2.5e10, '25,00 Mrd.'],
    [999.99e9, '999,99 Mrd.'],
    [1e12, '1,00 Bio.'],
    [999.99e12, '999,99 Bio.'],
    [1e15, '1,00 Brd.'],
    [4.5e15, '4,50 Brd.'],
    [999.99e15, '999,99 Brd.'],
    [1e18, '1,00 Trio.'],
    [999.99e18, '999,99 Trio.'],
    [1e21, '1,00 Trd.'],
    ['999.99e21', '999,99 Trd.'],
  ])('zeigt %s als Kurzform', (value, expected) => {
    expect(formatNum(value)).toBe(expected);
  });

  it.each<[number | string, string]>([
    ['1e24', '1,00e24'],
    ['1.23e45', '1,23e45'],
    ['1.5e308', '1,50e308'],
    ['1e400', '1,00e400'],
    ['1.239e1000000', '1,24e1000000'],
    ['8.999e8999999999999999', '9,00e8999999999999999'],
  ])('zeigt %s wissenschaftlich', (value, expected) => {
    expect(formatNum(value)).toBe(expected);
  });

  it.each<[number | string, string]>([
    [0.4, '0'],
    [0.5, '1'],
    [1.5, '2'],
    [2.5, '3'],
    [1234.5, '1.235'],
    [999.5, '1.000'],
    [999999.4, '999.999'],
    [999999.6, '1,00 Mio.'],
    [1.004e6, '1,00 Mio.'],
    [1.005e6, '1,01 Mio.'],
    [1.995e6, '2,00 Mio.'],
    [9.996e6, '10,00 Mio.'],
    [99.996e6, '100,00 Mio.'],
    [999994999, '999,99 Mio.'],
    [999995000, '1,00 Mrd.'],
    [999.996e6, '1,00 Mrd.'],
    [999.996e9, '1,00 Bio.'],
    [999.996e12, '1,00 Brd.'],
    [999.996e15, '1,00 Trio.'],
    [999.996e18, '1,00 Trd.'],
    ['999.994e21', '999,99 Trd.'],
    ['999.996e21', '1,00e24'],
    ['1.005e30', '1,01e30'],
    ['9.994e30', '9,99e30'],
    ['9.996e30', '1,00e31'],
    ['9.999e999999', '1,00e1000000'],
  ])('rundet %s mit Übertrag', (value, expected) => {
    expect(formatNum(value)).toBe(expected);
  });

  it.each<[number | string, string]>([
    [-1, '-1'],
    [-1284, '-1.284'],
    [-1.5, '-2'],
    [-999999.6, '-1,00 Mio.'],
    [-1.23e6, '-1,23 Mio.'],
    [-999.996e6, '-1,00 Mrd.'],
    ['-999.996e21', '-1,00e24'],
    ['-1.23e45', '-1,23e45'],
  ])('zeigt negative Werte: %s', (value, expected) => {
    expect(formatNum(value)).toBe(expected);
  });

  it.each<[number | string]>([[-0], [-0.4], ['-0'], ['-1e-400'], [1e-300], ['1e-1000000']])(
    'zeigt %s als 0 ohne Vorzeichen',
    (value) => {
      expect(formatNum(value)).toBe('0');
    },
  );

  it('nimmt Num, number und string an', () => {
    expect(formatNum(Num.from(1284))).toBe('1.284');
    expect(formatNum(1284)).toBe('1.284');
    expect(formatNum('1284')).toBe('1.284');
  });

  it('zeigt Rechenergebnisse ohne Gleitkomma-Rauschen', () => {
    expect(formatNum(Num.from(1.005).mul(1e6))).toBe('1,01 Mio.');
  });

  it.each([[NaN], [Infinity], ['abc']])('wirft bei %s', (value) => {
    expect(() => formatNum(value)).toThrow(RangeError);
    expect(() => formatRate(value)).toThrow(RangeError);
  });
});

describe('formatRate', () => {
  it.each<[number | string, string]>([
    [0, '0,0'],
    [3.2, '3,2'],
    [0.4, '0,4'],
    [10, '10,0'],
    [1284, '1.284,0'],
    [1284.56, '1.284,6'],
    [999999.9, '999.999,9'],
    [1.25, '1,3'],
    [1.05, '1,1'],
    [0.05, '0,1'],
    [0.95, '1,0'],
    [9.95, '10,0'],
    [999.95, '1.000,0'],
    [0.04, '0,0'],
    [1e-300, '0,0'],
  ])('zeigt %s unter 1e6 mit einer Nachkommastelle', (value, expected) => {
    expect(formatRate(value)).toBe(expected);
  });

  it.each<[number | string, string]>([
    [999999.94, '999.999,9'],
    [999999.96, '1,00 Mio.'],
    [1e6, '1,00 Mio.'],
    [1.23e9, '1,23 Mrd.'],
    ['999.996e21', '1,00e24'],
    ['1.23e45', '1,23e45'],
  ])('zeigt %s wie eine Menge', (value, expected) => {
    expect(formatRate(value)).toBe(expected);
  });

  it.each<[number, string]>([
    [-3.2, '-3,2'],
    [-1284, '-1.284,0'],
    [-0.05, '-0,1'],
    [-0.04, '0,0'],
    [-0, '0,0'],
    [-999999.96, '-1,00 Mio.'],
  ])('zeigt negative Werte: %d', (value, expected) => {
    expect(formatRate(value)).toBe(expected);
  });
});

describe('Notation', () => {
  it('nutzt standardmäßig Kurzformen', () => {
    expect(formatNum(1.23e6, {})).toBe('1,23 Mio.');
    expect(formatNum(1.23e6, { notation: 'short' })).toBe('1,23 Mio.');
    expect(formatRate(1.23e6, { notation: 'short' })).toBe('1,23 Mio.');
  });

  it.each<[number | string, string]>([
    [0, '0'],
    [999999, '999.999'],
    [999999.6, '1,00e6'],
    [1e6, '1,00e6'],
    [1.5e9, '1,50e9'],
    [-1.5e9, '-1,50e9'],
    [9.996e6, '1,00e7'],
    ['1.23e45', '1,23e45'],
  ])('zeigt %s wissenschaftlich ab 1e6', (value, expected) => {
    expect(formatNum(value, { notation: 'scientific' })).toBe(expected);
  });

  it('behält bei Raten die normale Darstellung unter 1e6', () => {
    expect(formatRate(3.2, { notation: 'scientific' })).toBe('3,2');
    expect(formatRate(999999.96, { notation: 'scientific' })).toBe('1,00e6');
    expect(formatRate(1.5e6, { notation: 'scientific' })).toBe('1,50e6');
  });
});
