/** Zulässiger Bereich einer Eingabe, beide Grenzen inklusive; ohne `max` nach oben offen. */
export interface NumberRange {
  readonly min: number;
  readonly max?: number;
}

/** Ganze Zahl ohne Gruppierung oder mit deutschem Tausenderpunkt in Dreiergruppen (`1.000`). */
const WHOLE_NUMBER_PATTERN = /^(\d+|\d{1,3}(\.\d{3})+)$/;
const DECIMAL_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
/** `20.000` meint auf Deutsch 20000, wäre als Dezimalzahl aber 20; daher abgelehnt. */
const THOUSANDS_PATTERN = /^[+-]?\d{1,3}(?:\.\d{3})+$/;

function inRange(value: number, range: NumberRange): boolean {
  return (
    Number.isFinite(value) && value >= range.min && (range.max === undefined || value <= range.max)
  );
}

/**
 * Liest eine ganze Zahl, deutsch geschrieben, optional mit Tausenderpunkt. Komma, Vorzeichen,
 * Exponent und unvollständige Tausendergruppen (`1.5`) gelten als ungültig (`null`), ebenso
 * Werte außerhalb des Bereichs.
 */
export function parseWholeNumber(text: string, range: NumberRange): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed.replaceAll('.', ''));
  return inRange(value, range) ? value : null;
}

/**
 * Liest eine Dezimalzahl mit Komma oder Punkt, auch mit Exponent (`1e3`). Tausendermuster wie
 * `20.000` sind mehrdeutig und gelten als ungültig (`null`), ebenso Werte außerhalb des Bereichs.
 */
export function parseDecimal(text: string, range: NumberRange): number | null {
  const trimmed = text.trim();
  if (THOUSANDS_PATTERN.test(trimmed)) {
    return null;
  }
  const normalized = trimmed.replace(',', '.');
  if (!DECIMAL_PATTERN.test(normalized)) {
    return null;
  }
  const value = Number(normalized);
  return inRange(value, range) ? value : null;
}
