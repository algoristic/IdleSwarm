import { formatAxisValue, formatComputeTime, formatElapsed, formatShare } from './model-format';

describe('formatElapsed', () => {
  it.each([
    [0, '0 s'],
    [0.5, '0,5 ms'],
    [20, '20 ms'],
    [500, '0,5 s'],
    [45_000, '45 s'],
    [59_990, '1 min'],
    [200_000, '3 min 20 s'],
    [3_600_000, '1 h'],
    [7_500_000, '2 h 05 min'],
    [604_800_000, '168 h'],
  ])('%d ms', (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });

  it('bleibt bei begrenzten Werten lesbar', () => {
    expect(formatElapsed(Number.MAX_VALUE)).toMatch(/e\d+ h/);
  });
});

describe('weitere Formate', () => {
  it('zeigt Rechenzeiten', () => {
    expect(formatComputeTime(123.4)).toBe('123 ms');
    expect(formatComputeTime(2500)).toBe('2,5 s');
  });

  it('zeigt Anteile', () => {
    expect(formatShare(0.1234).replace(/\s/g, ' ')).toBe('12,3 %');
  });

  it('beschriftet Achsen', () => {
    expect(formatAxisValue(0.01)).toBe('0,01');
    expect(formatAxisValue(0.5)).toBe('0,5');
    expect(formatAxisValue(1000)).toBe('1.000');
    expect(formatAxisValue(0)).toBe('0');
  });
});
