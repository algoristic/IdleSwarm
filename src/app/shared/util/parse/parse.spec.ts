import { parseDecimal, parseWholeNumber } from './parse';

const FROM_ZERO = { min: 0 };

describe('parseWholeNumber', () => {
  it.each([
    ['0', 0],
    [' 12 ', 12],
    ['007', 7],
    ['1.000', 1000],
    ['12.345.678', 12_345_678],
  ])('liest %j als %d', (text, expected) => {
    expect(parseWholeNumber(text, FROM_ZERO)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    '1,5',
    '1.5',
    '1.00',
    '1.0000',
    '.100',
    '-3',
    '+3',
    '1e3',
    '0x10',
    'zwölf',
    '1 000',
  ])('lehnt %j ab', (text) => {
    expect(parseWholeNumber(text, FROM_ZERO)).toBeNull();
  });

  it('prüft beide Grenzen inklusive', () => {
    expect(parseWholeNumber('1', { min: 1, max: 5 })).toBe(1);
    expect(parseWholeNumber('5', { min: 1, max: 5 })).toBe(5);
    expect(parseWholeNumber('0', { min: 1, max: 5 })).toBeNull();
    expect(parseWholeNumber('6', { min: 1, max: 5 })).toBeNull();
    expect(parseWholeNumber('1.000', { min: 0, max: 100 })).toBeNull();
  });

  it('lehnt nicht endliche Werte ab', () => {
    expect(parseWholeNumber('9'.repeat(400), FROM_ZERO)).toBeNull();
  });
});

describe('parseDecimal', () => {
  it.each([
    ['10', 10],
    [' 1,07 ', 1.07],
    ['1.07', 1.07],
    ['0', 0],
    ['1e3', 1000],
    ['2,5E-1', 0.25],
    ['.5', 0.5],
    ['5.', 5],
    ['1.0000', 1],
  ])('liest %j als %d', (text, expected) => {
    expect(parseDecimal(text, FROM_ZERO)).toBe(expected);
  });

  it.each([
    '',
    ' ',
    'abc',
    '1,2,3',
    '1,5.3',
    'Infinity',
    '1e999',
    '0x10',
    '20.000',
    '1.000.000',
    '1 000',
  ])('lehnt %j ab', (text) => {
    expect(parseDecimal(text, FROM_ZERO)).toBeNull();
  });

  it('prüft beide Grenzen inklusive, auch für Vorzeichen', () => {
    expect(parseDecimal('1', { min: 0, max: 1 })).toBe(1);
    expect(parseDecimal('1,5', { min: 0, max: 1 })).toBeNull();
    expect(parseDecimal('-1', FROM_ZERO)).toBeNull();
    expect(parseDecimal('-1', { min: -1 })).toBe(-1);
    expect(parseDecimal('+0,5', FROM_ZERO)).toBe(0.5);
  });
});
