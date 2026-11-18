import Decimal from 'break_infinity.js';

/** Alles, woraus sich ein {@link Num} erzeugen lässt. */
export type NumLike = Num | number | string;

/** Ab diesem Exponenten behandelt `break_infinity.js` Werte als unendlich. */
const EXPONENT_LIMIT = 9e15;

/** Skaliert die Mantisse beim Entrauschen auf 15 signifikante Stellen. */
const MANTISSA_SCALE = 1e14;

/** Obergrenze des Caches in {@link Num.fromNumber}. */
const NUMBER_CACHE_LIMIT = 1024;

const NUMBER_PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/;

function invalid(message: string): never {
  throw new RangeError(`Num: ${message}`);
}

/** Entfernt Gleitkomma-Rauschen, damit z. B. `3 * 1284` exakt `3852` ergibt. */
function denoise(mantissa: number): number {
  return (Math.sign(mantissa) * Math.round(Math.abs(mantissa) * MANTISSA_SCALE)) / MANTISSA_SCALE;
}

/**
 * Unveränderliche große Zahl; kapselt `break_infinity.js` vollständig (ADR-002).
 *
 * Werte sind immer normalisiert: `0` oder `mantissa * 10^exponent` mit `1 <= |mantissa| < 10` und
 * ganzzahligem Exponenten. Ungültige Eingaben und Ergebnisse (`NaN`, unendlich, Exponent ab `9e15`)
 * werfen einen `RangeError`; zu kleine Beträge werden zu `0`.
 *
 * `mul`, `div` und `pow` runden auf 15 signifikante Stellen, `add` und `sub` rechnen ebenso genau.
 */
export class Num {
  static readonly ZERO = new Num(new Decimal(0));
  static readonly ONE = new Num(new Decimal(1));

  /** `Num` ist unveränderlich; Parameter und Schrittweiten wiederholen sich in jedem Schritt. */
  static readonly #fromNumberCache = new Map<number, Num>();

  readonly #value: Decimal;

  private constructor(value: Decimal) {
    this.#value = value;
    Object.freeze(this);
  }

  static from(value: NumLike): Num {
    if (value instanceof Num) {
      return value;
    }
    if (typeof value === 'number') {
      return Num.fromNumber(value);
    }
    if (typeof value === 'string') {
      return Num.parse(value);
    }
    return invalid(`ungültiger Wert ${String(value)}`);
  }

  private static fromNumber(value: number): Num {
    const cached = Num.#fromNumberCache.get(value);
    if (cached) {
      return cached;
    }
    if (!Number.isFinite(value)) {
      invalid(`ungültige Zahl ${value}`);
    }
    // `toExponential` liefert die kürzesten Ziffern, also dasselbe Ergebnis wie aus dem String.
    const [mantissa, exponent] = value.toExponential().split('e');
    const result = Num.fromParts(Number(mantissa), Number(exponent));
    if (Num.#fromNumberCache.size >= NUMBER_CACHE_LIMIT) {
      Num.#fromNumberCache.clear();
    }
    Num.#fromNumberCache.set(value, result);
    return result;
  }

  /** Eigener Parser: Die Bibliothek akzeptiert `12abc` und liefert für `1E400` unendlich. */
  private static parse(text: string): Num {
    const match = NUMBER_PATTERN.exec(text);
    if (!match) {
      return invalid(`ungültiger Text "${text}"`);
    }
    const [, sign, integer, fraction = '', exponent = '0'] = match;
    const digits = integer + fraction;
    if (digits === '') {
      return invalid(`ungültiger Text "${text}"`);
    }
    const first = digits.search(/[1-9]/);
    if (first < 0) {
      return Num.ZERO;
    }
    const mantissa = Number(`${digits[first]}.${digits.slice(first + 1)}`);
    return Num.fromParts(
      sign === '-' ? -mantissa : mantissa,
      Number(exponent) + integer.length - 1 - first,
    );
  }

  private static fromParts(mantissa: number, exponent: number): Num {
    if (!Number.isFinite(mantissa) || Number.isNaN(exponent) || exponent >= EXPONENT_LIMIT) {
      invalid(`Wert außerhalb des gültigen Bereichs (${mantissa}e${exponent})`);
    }
    if (mantissa === 0 || exponent <= -EXPONENT_LIMIT) {
      return Num.ZERO;
    }
    let m = mantissa;
    let e = exponent;
    if (Math.abs(m) >= 10) {
      m /= 10;
      e += 1;
    } else if (Math.abs(m) < 1) {
      m *= 10;
      e -= 1;
    }
    if (e >= EXPONENT_LIMIT) {
      invalid(`Wert außerhalb des gültigen Bereichs (${m}e${e})`);
    }
    // `+ 0` macht aus einem Exponenten `-0` eine normale `0`.
    return new Num(Decimal.fromMantissaExponent_noNormalize(m, e + 0));
  }

  private static wrap(value: Decimal): Num {
    return Num.fromParts(value.m, value.e);
  }

  private static wrapDenoised(value: Decimal): Num {
    return Num.fromParts(denoise(value.m), value.e);
  }

  /** Normalisierte Mantisse (`1 <= |m| < 10`, bei null `0`), mit Vorzeichen. */
  get mantissa(): number {
    return this.#value.m;
  }

  /** Ganzzahliger Zehnerexponent (bei null `0`). */
  get exponent(): number {
    return this.#value.e;
  }

  add(other: NumLike): Num {
    return Num.wrap(this.#value.add(Num.from(other).#value));
  }

  sub(other: NumLike): Num {
    return this.add(Num.from(other).neg());
  }

  mul(other: NumLike): Num {
    return Num.wrapDenoised(this.#value.mul(Num.from(other).#value));
  }

  div(other: NumLike): Num {
    const divisor = Num.from(other);
    if (divisor.isZero()) {
      // Die Bibliothek liefert hier still 0.
      invalid('Division durch 0');
    }
    return Num.wrapDenoised(this.#value.div(divisor.#value));
  }

  /** Potenz; Exponenten jenseits des `number`-Bereichs zählen als ±unendlich und gerade. */
  pow(exponent: NumLike): Num {
    const power = Num.from(exponent).toNumber();
    if (power === 0) {
      return Num.ONE;
    }
    if (this.isZero()) {
      return power < 0 ? invalid('Division durch 0') : Num.ZERO;
    }
    if (this.isNegative() && Number.isFinite(power) && !Number.isInteger(power)) {
      invalid(`negative Basis mit gebrochenem Exponenten ${power}`);
    }
    const magnitude = this.abs().powOfPositive(power);
    return this.isNegative() && Math.abs(power % 2) === 1 ? magnitude.neg() : magnitude;
  }

  private powOfPositive(power: number): Num {
    if (this.eq(Num.ONE)) {
      return Num.ONE;
    }
    // Vorab prüfen: Die Bibliothek macht aus einem unendlichen Ergebnis still 0.
    const log10 = power * this.#value.log10();
    if (log10 >= EXPONENT_LIMIT) {
      invalid(`Potenz außerhalb des gültigen Bereichs (10^${log10})`);
    }
    return log10 <= -EXPONENT_LIMIT ? Num.ZERO : Num.wrapDenoised(this.#value.pow(power));
  }

  neg(): Num {
    return Num.fromParts(-this.mantissa, this.exponent);
  }

  abs(): Num {
    return this.isNegative() ? this.neg() : this;
  }

  floor(): Num {
    return this.roundWith(Math.floor);
  }

  ceil(): Num {
    return this.roundWith(Math.ceil);
  }

  /** Rundet kaufmännisch: `.5` geht vom Nullpunkt weg (`-2.5` wird `-3`). */
  round(): Num {
    return this.roundWith((n) => Math.sign(n) * Math.round(Math.abs(n)));
  }

  private roundWith(round: (value: number) => number): Num {
    // Beträge unter 0,1 können als `number` zu 0 werden; das Vorzeichen entscheidet trotzdem.
    const value = this.exponent < -1 ? Math.sign(this.mantissa) * 0.05 : this.toNumber();
    const rounded = round(value);
    // Bereits ganze (auch sehr große) Werte bleiben unverändert und verlieren keine Stellen.
    return rounded === value ? this : Num.fromNumber(rounded);
  }

  min(other: NumLike): Num {
    const value = Num.from(other);
    return value.lt(this) ? value : this;
  }

  max(other: NumLike): Num {
    const value = Num.from(other);
    return value.gt(this) ? value : this;
  }

  cmp(other: NumLike): -1 | 0 | 1 {
    return this.#value.cmp(Num.from(other).#value);
  }

  eq(other: NumLike): boolean {
    return this.cmp(other) === 0;
  }

  lt(other: NumLike): boolean {
    return this.cmp(other) < 0;
  }

  lte(other: NumLike): boolean {
    return this.cmp(other) <= 0;
  }

  gt(other: NumLike): boolean {
    return this.cmp(other) > 0;
  }

  gte(other: NumLike): boolean {
    return this.cmp(other) >= 0;
  }

  isZero(): boolean {
    return this.mantissa === 0;
  }

  isNegative(): boolean {
    return this.mantissa < 0;
  }

  /** Nächstgelegene `number`; außerhalb des Bereichs `±Infinity` bzw. `0`. */
  toNumber(): number {
    return Number(this.toString()) + 0;
  }

  /** Verlustfreie Darstellung `<mantisse>e<exponent>`, z. B. `1.284e3`. */
  toString(): string {
    return `${this.mantissa}e${this.exponent}`;
  }

  toJSON(): string {
    return this.toString();
  }
}
