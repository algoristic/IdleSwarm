import { Num, NumLike } from '../num/num';
import { formatNum } from './format';

/** Ab hier kürzt `formatNum` auf Kurzformen, ab `SCIENTIFIC_FROM` auf wissenschaftliche Notation. */
const SHORT_FROM = 6;
const SCIENTIFIC_FROM = 24;
const COMPACT_FRACTION_DIGITS = 2;

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
/** Darüber sind Minuten bedeutungslos und `number` wäre nicht mehr verlässlich. */
const HOURS_ONLY_FROM_SECONDS = 1e9;

/** Signifikante Stellen, die `formatNum` ab 1 Mio. zeigt. */
function shownDigits(exponent: number): number {
  return exponent < SCIENTIFIC_FROM
    ? (exponent % 3) + 1 + COMPACT_FRACTION_DIGITS
    : 1 + COMPACT_FRACTION_DIGITS;
}

/**
 * Rundet einen nicht negativen Wert gerichtet auf die Genauigkeit der Anzeige. `formatNum` rundet
 * selbst kaufmännisch und ließe `1,999 Mio.` sonst als `2,00 Mio.` erscheinen.
 */
function roundForDisplay(value: Num, up: boolean): Num {
  const { exponent } = value;
  if (exponent < SHORT_FROM) {
    return up ? value.ceil() : value.floor();
  }
  const keep = shownDigits(exponent);
  const digits = String(value.mantissa).replace('.', '');
  const head = BigInt(digits.slice(0, keep).padEnd(keep, '0'));
  const carry = up && /[1-9]/.test(digits.slice(keep)) ? 1n : 0n;
  return Num.from(`${head + carry}e${exponent - keep + 1}`);
}

export function roundDownForDisplay(value: Num): Num {
  return roundForDisplay(value, false);
}

export function roundUpForDisplay(value: Num): Num {
  return roundForDisplay(value, true);
}

/** Mengen wie Einheiten und Nahrung: Die Anzeige rundet ab (Game-Design §4). */
export function formatDown(value: Num): string {
  return formatNum(roundDownForDisplay(value));
}

export function formatUp(value: Num): string {
  return formatNum(roundUpForDisplay(value));
}

/** Deutsche Zeitangabe: `45 s`, `12 min 30 s`, `2 h 05 min`. */
export function formatDuration(seconds: Num): string {
  const total = seconds.ceil();
  if (total.gte(HOURS_ONLY_FROM_SECONDS)) {
    return `${formatNum(total.div(SECONDS_PER_HOUR).floor())} h`;
  }
  const value = total.toNumber();
  const minutes = Math.floor(value / SECONDS_PER_MINUTE);
  if (value >= SECONDS_PER_HOUR) {
    const hours = Math.floor(value / SECONDS_PER_HOUR);
    return `${formatNum(hours)} h ${pad(minutes % SECONDS_PER_MINUTE)} min`;
  }
  const rest = value % SECONDS_PER_MINUTE;
  return minutes > 0 ? `${minutes} min ${pad(rest)} s` : `${rest} s`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** Anteil als Prozentwert für Balken, auf 0 bis 100 begrenzt. */
export function barPercent(share: NumLike): number {
  return Num.from(share).mul(100).min(100).max(0).toNumber();
}
