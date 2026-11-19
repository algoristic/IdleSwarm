import { parseWholeNumber } from '@app/shared/util/parse/parse';

const FROM_ZERO = { min: 0 };

/**
 * Liest eine Anzahl aus der Eingabe: ganze Zahl ab 0, deutsch geschrieben (`1.000`). Die
 * Obergrenze der vorhandenen Drohnen prüfen Schema und Formular.
 */
export function parseWholeCount(text: string): number | null {
  return parseWholeNumber(text, FROM_ZERO);
}
