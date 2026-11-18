const DATE_TIME_FORMAT = new Intl.DateTimeFormat('de-DE', {
  dateStyle: 'medium',
  timeStyle: 'medium',
});

/**
 * Wandelt Unix-Zeit in ein Datum; `null`, wenn der Wert außerhalb des Date-Bereichs liegt, wie es
 * ein Spielstand enthalten kann.
 */
function toDate(ms: number): Date | null {
  // Formatierung eines übergebenen Zeitpunkts; die Uhr wird nicht gelesen.
  // eslint-disable-next-line no-restricted-syntax
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isValidTimestamp(ms: number): boolean {
  return toDate(ms) !== null;
}

/** Deutsches Datum mit Uhrzeit, z. B. `18.11.2026, 14:05:09`; leer bei ungültigem Wert. */
export function formatDateTime(ms: number): string {
  const date = toDate(ms);
  return date === null ? '' : DATE_TIME_FORMAT.format(date);
}

/** Maschinenlesbarer Zeitpunkt für `<time datetime>`; leer bei ungültigem Wert. */
export function formatIsoDateTime(ms: number): string {
  return toDate(ms)?.toISOString() ?? '';
}
