import { Num, NumLike } from '../num/num';
import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from '../time/time-units';
import { DEFAULT_NOTATION, FormatOptions, formatNum, Notation } from './format';

/** Ab hier kürzt `formatNum` auf Kurzformen, ab `SCIENTIFIC_FROM` auf wissenschaftliche Notation. */
const SHORT_FROM = 6;
const SCIENTIFIC_FROM = 24;
const COMPACT_FRACTION_DIGITS = 2;

/** Darüber sind Minuten bedeutungslos und `number` wäre nicht mehr verlässlich. */
const HOURS_ONLY_FROM_SECONDS = 1e9;

/** Signifikante Stellen, die `formatNum` ab 1 Mio. in der Notation zeigt. */
function shownDigits(exponent: number, notation: Notation): number {
  const grouped =
    notation === 'engineering' || (notation === 'short' && exponent < SCIENTIFIC_FROM);
  return grouped ? (exponent % 3) + 1 + COMPACT_FRACTION_DIGITS : 1 + COMPACT_FRACTION_DIGITS;
}

/**
 * Rundet einen nicht negativen Wert gerichtet auf die Genauigkeit der Anzeige. `formatNum` rundet
 * selbst kaufmännisch und ließe `1,999 Mio.` sonst als `2,00 Mio.` erscheinen.
 */
function roundForDisplay(value: Num, up: boolean, notation: Notation): Num {
  const { exponent } = value;
  if (exponent < SHORT_FROM) {
    return up ? value.ceil() : value.floor();
  }
  const keep = shownDigits(exponent, notation);
  const digits = String(value.mantissa).replace('.', '');
  const head = BigInt(digits.slice(0, keep).padEnd(keep, '0'));
  const carry = up && /[1-9]/.test(digits.slice(keep)) ? 1n : 0n;
  return Num.from(`${head + carry}e${exponent - keep + 1}`);
}

export function roundDownForDisplay(value: Num, notation: Notation = DEFAULT_NOTATION): Num {
  return roundForDisplay(value, false, notation);
}

export function roundUpForDisplay(value: Num, notation: Notation = DEFAULT_NOTATION): Num {
  return roundForDisplay(value, true, notation);
}

/** Mengen wie Einheiten und Nahrung: Die Anzeige rundet ab (Game-Design §4). */
export function formatDown(value: Num, options: FormatOptions = {}): string {
  return formatNum(roundDownForDisplay(value, options.notation), options);
}

export function formatUp(value: Num, options: FormatOptions = {}): string {
  return formatNum(roundUpForDisplay(value, options.notation), options);
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

/**
 * Teilt 100 % auf Anteile auf: ganze Prozent, Summe 100, der Rundungsrest geht an den letzten
 * Eintrag. Einzeln gerundet ergäben 1 : 7 (12,5 % und 87,5 %) zusammen 101 %. Ist die Summe 0,
 * sind alle Einträge 0.
 */
export function splitPercents(shares: readonly number[]): number[] {
  const sum = shares.reduce((total, share) => total + share, 0);
  if (!(sum > 0)) {
    return shares.map(() => 0);
  }
  const percents = shares.map((share) => Math.round((share / sum) * 100));
  const head = percents.slice(0, -1);
  return [...head, 100 - head.reduce((total, percent) => total + percent, 0)];
}
