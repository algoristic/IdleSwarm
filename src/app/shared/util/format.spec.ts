import { formatDuration, formatInteger, formatNumber, formatTime } from './format';

describe('formatNumber', () => {
  it('zeigt unter 100 eine abgerundete Nachkommastelle ohne Null am Ende', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(5)).toBe('5');
    expect(formatNumber(0.05)).toBe('0');
    expect(formatNumber(12.34)).toBe('12,3');
    expect(formatNumber(99.99)).toBe('99,9');
  });

  it('zeigt ab 100 ganze Zahlen mit Tausenderpunkt', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1234.9)).toBe('1.234');
    expect(formatNumber(9999.99)).toBe('9.999');
  });

  it('kürzt ab 10000 mit Suffix', () => {
    expect(formatNumber(10000)).toBe('10 Tsd.');
    expect(formatNumber(12345)).toBe('12,3 Tsd.');
    expect(formatNumber(99999.99)).toBe('99,9 Tsd.');
    expect(formatNumber(123456)).toBe('123 Tsd.');
    expect(formatNumber(999999)).toBe('999 Tsd.');
    expect(formatNumber(1e6)).toBe('1 Mio.');
    expect(formatNumber(1.5e6)).toBe('1,5 Mio.');
    expect(formatNumber(1e9)).toBe('1 Mrd.');
    expect(formatNumber(1e12)).toBe('1 Bio.');
    expect(formatNumber(1e15)).toBe('1 Brd.');
    expect(formatNumber(1e18)).toBe('1 Trio.');
    expect(formatNumber(1e21)).toBe('1 Trd.');
    expect(formatNumber(1e24)).toBe('1 Quad.');
    expect(formatNumber(1e27)).toBe('1 Qrd.');
  });

  it('nutzt Quint. als letzte Suffixstufe', () => {
    expect(formatNumber(1e30)).toBe('1 Quint.');
    expect(formatNumber(1.5e30)).toBe('1,4 Quint.');
    expect(formatNumber(999e30)).toBe('999 Quint.');
  });

  it('wechselt ab 1e33 in die Exponentenform mit zwei Nachkommastellen', () => {
    expect(formatNumber(1e33)).toBe('1e33');
    expect(formatNumber(1.5e33)).toBe('1,50e33');
    expect(formatNumber(2.345e40)).toBe('2,35e40');
  });

  it('setzt bei negativen Zahlen ein echtes Minuszeichen davor', () => {
    expect(formatNumber(-5)).toBe('−5');
    expect(formatNumber(-1234)).toBe('−1.234');
    expect(formatNumber(-1.5e6)).toBe('−1,5 Mio.');
  });

  it('zeigt für nicht endliche Zahlen ∞', () => {
    expect(formatNumber(Infinity)).toBe('∞');
    expect(formatNumber(-Infinity)).toBe('∞');
    expect(formatNumber(NaN)).toBe('∞');
  });
});

describe('formatInteger', () => {
  it('rundet ab und gleicht Fließkommafehler knapp unter der Ganzzahl aus', () => {
    expect(formatInteger(2.9999999999)).toBe('3');
    expect(formatInteger(2.999)).toBe('2');
    expect(formatInteger(3)).toBe('3');
    expect(formatInteger(12345.9)).toBe('12,3 Tsd.');
  });
});

describe('formatTime', () => {
  it('zeigt Minuten und Sekunden und rundet auf', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(0.1)).toBe('0:01');
    expect(formatTime(59)).toBe('0:59');
    expect(formatTime(59.2)).toBe('1:00');
  });

  it('zeigt ab einer Stunde Stunden, Minuten und Sekunden', () => {
    expect(formatTime(3599.5)).toBe('1:00:00');
    expect(formatTime(3661)).toBe('1:01:01');
    expect(formatTime(36000)).toBe('10:00:00');
  });

  it('zeigt negative Zeiten als 0:00', () => {
    expect(formatTime(-5)).toBe('0:00');
  });

  it('zeigt für nicht endliche Zeiten einen Strich', () => {
    expect(formatTime(Infinity)).toBe('–');
    expect(formatTime(NaN)).toBe('–');
  });
});

describe('formatDuration', () => {
  it('zeigt unter einer Minute gerundete Sekunden', () => {
    expect(formatDuration(0)).toBe('0 s');
    expect(formatDuration(59.4)).toBe('59 s');
  });

  it('zeigt unter einer Stunde Minuten und Sekunden', () => {
    expect(formatDuration(59.6)).toBe('1 min 0 s');
    expect(formatDuration(60)).toBe('1 min 0 s');
    expect(formatDuration(3599)).toBe('59 min 59 s');
  });

  it('zeigt ab einer Stunde Stunden und Minuten', () => {
    expect(formatDuration(3599.5)).toBe('1 h 0 min');
    expect(formatDuration(3600)).toBe('1 h 0 min');
    expect(formatDuration(7325)).toBe('2 h 2 min');
  });
});
