import { formatDateTime, formatIsoDateTime, isValidTimestamp } from './date-format';

describe('date-format', () => {
  const MS = Date.UTC(2026, 10, 18, 13, 5, 9);

  it('formatiert Unix-Zeit maschinenlesbar', () => {
    expect(formatIsoDateTime(MS)).toBe('2026-11-18T13:05:09.000Z');
  });

  it('formatiert Unix-Zeit deutsch mit Datum und Uhrzeit', () => {
    expect(formatDateTime(MS)).toMatch(/^18\.11\.2026, \d{2}:05:09$/);
  });

  it('erkennt Werte außerhalb des Date-Bereichs', () => {
    expect(isValidTimestamp(MS)).toBe(true);
    expect(isValidTimestamp(9e15)).toBe(false);
    expect(formatDateTime(9e15)).toBe('');
    expect(formatIsoDateTime(9e15)).toBe('');
  });
});
