import { Num, NumLike } from './num';

/** Darstellung großer Zahlen; die technische Notation folgt in AP 1.5.3. */
export type Notation = 'short' | 'scientific';

export interface FormatOptions {
  /** Standard: `'short'`. */
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

function renderShort(value: Digits): string {
  const rounded = roundDigits(value, (value.exponent % 3) + 1 + COMPACT_FRACTION_DIGITS);
  // Der Übertrag kann die Einheit wechseln oder die Kurzformen ganz verlassen.
  if (rounded.exponent >= SCIENTIFIC_FROM_EXPONENT) {
    return renderScientific(rounded);
  }
  const integerLength = (rounded.exponent % 3) + 1;
  const fractionEnd = integerLength + COMPACT_FRACTION_DIGITS;
  const padded = rounded.digits.padEnd(fractionEnd, '0');
  const unit = SHORT_UNITS[(rounded.exponent - integerLength + 1 - SHORT_FROM_EXPONENT) / 3];
  const fraction = padded.slice(integerLength, fractionEnd);
  return `${withFraction(padded.slice(0, integerLength), fraction)} ${unit}`;
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
  const useShort =
    (options.notation ?? 'short') === 'short' && parts.exponent < SCIENTIFIC_FROM_EXPONENT;
  return sign + (useShort ? renderShort(parts) : renderScientific(parts));
}

/** Formatiert eine Menge: `1.284`, `1,23 Mio.`, `1,23e45`. */
export function formatNum(value: NumLike, options: FormatOptions = {}): string {
  return format(value, 0, options);
}

/** Formatiert eine Rate: wie {@link formatNum}, unter 1e6 aber mit einer Nachkommastelle (`3,2`). */
export function formatRate(value: NumLike, options: FormatOptions = {}): string {
  return format(value, 1, options);
}
