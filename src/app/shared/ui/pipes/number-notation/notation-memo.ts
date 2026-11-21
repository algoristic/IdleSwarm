import type { FormatOptions, Notation } from '../../../util/format/format';

/**
 * Merkt sich das letzte Ergebnis einer Formatierung. Die Zahlen-Pipes sind unrein, damit ein
 * Wechsel der Notation sofort greift, obwohl sich der Wert nicht ändert; bei gleichem Wert und
 * gleicher Notation kostet ein Aufruf dann nur zwei Vergleiche.
 */
export class NotationMemo<T> {
  readonly #format: (value: T, options: FormatOptions) => string;
  #value: T | undefined;
  #notation: Notation | undefined;
  #text = '';

  constructor(format: (value: T, options: FormatOptions) => string) {
    this.#format = format;
  }

  format(value: T, notation: Notation): string {
    if (value !== this.#value || notation !== this.#notation || this.#notation === undefined) {
      this.#text = this.#format(value, { notation });
      this.#value = value;
      this.#notation = notation;
    }
    return this.#text;
  }
}
