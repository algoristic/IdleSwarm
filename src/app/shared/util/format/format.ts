import { Num, NumLike } from '../num/num';

/**
 * Darstellung großer Zahlen ab 1 Mio. (TK §9): Kurzformen (`1,23 Mio.`, ab 1e24 wissenschaftlich),
 * wissenschaftlich (`1,23e6`) oder technisch (`12,35e9`, Exponent ein Vielfaches von 3). Darunter
 * schreiben alle gleich (`1.284`). Die Namen sind dieselben wie die Einstellung `numberFormat`.
 */
export const NOTATIONS = ['short', 'scientific', 'engineering'] as const;
export type Notation = (typeof NOTATIONS)[number];

export const DEFAULT_NOTATION: Notation = 'short';

export interface FormatOptions {
  /** Standard: {@link DEFAULT_NOTATION}. */
  notation?: Notation;
}

/** Kurzformen je drei Zehnerpotenzen, beginnend bei 1e6. */
const SHORT_UNITS = ['Mio.', 'Mrd.', 'Bio.', 'Brd.', 'Trio.', 'Trd.'];

const SHORT_FROM_EXPONENT = 6;
const SCIENTIFIC_FROM_EXPONENT = SHORT_FROM_EXPONENT + SHORT_UNITS.length * 3;
const COMPACT_FRACTION_DIGITS = 2;

/** Dezimalziffern `d.ddd * 10^exponent`; die Ziffernfolge `'0'` steht für null. */
interface Digits {
  digits: string;
  exponent: number;
}

const ZERO_DIGITS: Digits = { digits: '0', exponent: 0 };

/**
 * Rundet kaufmännisch auf `keep` signifikante Stellen. Gerechnet wird auf den Dezimalziffern, damit
 * z. B. `1,005` nicht durch seine binäre Näherung abgerundet wird.
 */
function roundDigits({ digits, exponent }: Digits, keep: number): Digits {
  if (keep >= digits.length) {
    return { digits, exponent };
  }
  if (keep < 0) {
    return ZERO_DIGITS;
  }
  const head = digits.slice(0, keep);
  if (digits[keep] < '5') {
    return head === '' ? ZERO_DIGITS : { digits: head, exponent };
  }
  const incremented = String(BigInt(head || '0') + 1n);
  return incremented.length > head.length
    ? { digits: incremented.slice(0, Math.max(keep, 1)), exponent: exponent + 1 }
    : { digits: incremented, exponent };
}

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+$)/g, '.');
}

function withFraction(integer: string, fraction: string): string {
  return fraction === '' ? integer : `${integer},${fraction}`;
}

function renderPlain({ digits, exponent }: Digits, fractionDigits: number): string {
  const integerLength = Math.max(exponent + 1, 0);
  const integer = digits.slice(0, integerLength).padEnd(integerLength, '0') || '0';
  const fraction = ('0'.repeat(Math.max(-exponent - 1, 0)) + digits.slice(integerLength))
    .padEnd(fractionDigits, '0')
    .slice(0, fractionDigits);
  return withFraction(groupThousands(integer), fraction);
}

function renderScientific(value: Digits): string {
  const { digits, exponent } = roundDigits(value, COMPACT_FRACTION_DIGITS + 1);
  const padded = digits.padEnd(COMPACT_FRACTION_DIGITS + 1, '0');
  return `${withFraction(padded[0], padded.slice(1))}e${exponent}`;
}

/** Ein bis drei Vorkommastellen je drei Zehnerpotenzen; `suffix` erhält den Exponenten der Gruppe. */
function renderGrouped(value: Digits, suffix: (groupExponent: number) => string): string {
  const integerLength = (value.exponent % 3) + 1;
  const fractionEnd = integerLength + COMPACT_FRACTION_DIGITS;
  const padded = value.digits.padEnd(fractionEnd, '0');
  const fraction = padded.slice(integerLength, fractionEnd);
  return (
    withFraction(padded.slice(0, integerLength), fraction) +
    suffix(value.exponent - integerLength + 1)
  );
}

function roundGrouped(value: Digits): Digits {
  // Der Übertrag kann die Gruppe wechseln (`999,996 Mio.` → `1,00 Mrd.`).
  return roundDigits(value, (value.exponent % 3) + 1 + COMPACT_FRACTION_DIGITS);
}

function renderShort(value: Digits): string {
  const rounded = roundGrouped(value);
  // Der Übertrag kann die Kurzformen ganz verlassen.
  if (rounded.exponent >= SCIENTIFIC_FROM_EXPONENT) {
    return renderScientific(rounded);
  }
  return renderGrouped(
    rounded,
    (groupExponent) => ` ${SHORT_UNITS[(groupExponent - SHORT_FROM_EXPONENT) / 3]}`,
  );
}

function renderEngineering(value: Digits): string {
  return renderGrouped(roundGrouped(value), (groupExponent) => `e${groupExponent}`);
}

function renderLarge(value: Digits, notation: Notation): string {
  switch (notation) {
    case 'short':
      return value.exponent < SCIENTIFIC_FROM_EXPONENT
        ? renderShort(value)
        : renderScientific(value);
    case 'scientific':
      return renderScientific(value);
    case 'engineering':
      return renderEngineering(value);
  }
}

function format(input: NumLike, fractionDigits: number, options: FormatOptions): string {
  const value = Num.from(input);
  let parts: Digits = {
    digits: String(Math.abs(value.mantissa)).replace('.', ''),
    exponent: value.exponent,
  };
  if (parts.exponent < SHORT_FROM_EXPONENT) {
    parts = roundDigits(parts, parts.exponent + 1 + fractionDigits);
  }
  const sign = value.isNegative() && parts.digits !== '0' ? '-' : '';
  if (parts.exponent < SHORT_FROM_EXPONENT) {
    return sign + renderPlain(parts, fractionDigits);
  }
  return sign + renderLarge(parts, options.notation ?? DEFAULT_NOTATION);
}

/**
 * Formatiert eine Menge: `1.284`, `1,23 Mio.`, `1,23e45`; wissenschaftlich `1,23e6`, technisch
 * `12,35e9`.
 */
export function formatNum(value: NumLike, options: FormatOptions = {}): string {
  return format(value, 0, options);
}

/** Formatiert eine Rate: wie {@link formatNum}, unter 1e6 aber mit einer Nachkommastelle (`3,2`). */
export function formatRate(value: NumLike, options: FormatOptions = {}): string {
  return format(value, 1, options);
}
