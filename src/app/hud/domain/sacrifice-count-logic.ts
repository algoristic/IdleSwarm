/** Ganze Zahl ohne Gruppierung oder mit deutschem Tausenderpunkt in Dreiergruppen (`1.000`). */
const WHOLE_COUNT = /^(\d+|\d{1,3}(\.\d{3})+)$/;

/**
 * Liest eine Anzahl aus der Eingabe: ganze Zahl ab 0, deutsch geschrieben. Komma, Vorzeichen,
 * Exponent und unvollständige Tausendergruppen (`1.5`) gelten als ungültig (`null`).
 */
export function parseWholeCount(text: string): number | null {
  const trimmed = text.trim();
  if (!WHOLE_COUNT.test(trimmed)) {
    return null;
  }
  const value = Number(trimmed.replaceAll('.', ''));
  return Number.isFinite(value) ? value : null;
}
