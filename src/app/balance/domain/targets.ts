import { MS_PER_MINUTE, MS_PER_SECOND } from '@app/shared/util/time/time-units';

/**
 * Pacing-Zielbänder (Projektplan §3.5, technisches Konzept §5.5) als Konfiguration. Die Werte stehen
 * wörtlich wie im Projektplan; sie werden in AP 1.5.5 feinjustiert und sind sonst nicht zu ändern.
 * Sie gelten nur für die Bots „Aktiv“ und „Idle“ (technisches Konzept §5.3, Game-Design §6).
 */

/** Stabile IDs der Kennzahlen aus Projektplan §3.5 in der Reihenfolge der Tabelle. */
export const PACING_TARGET_IDS = [
  'firstDecision',
  'buyInterval',
  'siteDuration',
  'longestDrought',
  'newMechanic',
] as const;

export type PacingTargetId = (typeof PACING_TARGET_IDS)[number];

/** Bot-Arten mit Zielband; die IDs gleichen den Bot-Arten der Modell-Seite. */
export const PACING_BOTS = ['active', 'idle'] as const;

export type PacingBot = (typeof PACING_BOTS)[number];

export const PACING_UNITS = ['second', 'minute'] as const;

export type PacingUnit = (typeof PACING_UNITS)[number];

/**
 * Gemessene Größen, über die ein Band bewertet wird (Mess-Definitionen Game-Design §6.1/§6.2):
 * erster Kauf, Median der Kauflücken und längste Wartezeit der ersten 30 min, Dauer je
 * abgeschlossener Futterstelle, längste Strecke ohne Kauf, größter Abstand neuer Mechaniken.
 */
export const PACING_MEASURE_IDS = [
  'firstBuy',
  'buyGapMedian',
  'longestWait',
  'siteDuration',
  'longestNoBuy',
  'unlockGap',
] as const;

export type PacingMeasureId = (typeof PACING_MEASURE_IDS)[number];

export interface PacingBound {
  readonly value: number;
  /** `true` bei „≤“ bzw. „5–60“, `false` bei „<“. */
  readonly inclusive: boolean;
}

/** Band in `unit`; eine fehlende Grenze bedeutet „unbegrenzt“. */
export interface PacingBand {
  readonly min: PacingBound | null;
  readonly max: PacingBound | null;
  readonly unit: PacingUnit;
}

/** Zeitfenster einer Kennzahl ab Laufbeginn, etwa „erste 30 min“. */
export interface PacingWindow {
  readonly value: number;
  readonly unit: PacingUnit;
}

/**
 * Bewertung über eine gemessene Größe. `upperOnly` prüft nur die Obergrenze; so liest Game-Design
 * §6.1 „5–60 s“ für Aktiv über die längste Wartezeit („≤ 60 s“).
 */
export interface PacingCheck {
  readonly measure: PacingMeasureId;
  readonly upperOnly?: boolean;
}

export interface PacingTarget {
  readonly id: PacingTargetId;
  readonly bot: PacingBot;
  readonly band: PacingBand;
  readonly window: PacingWindow | null;
  /** Leer: Band angelegt, aber nicht gemessen. */
  readonly checks: readonly PacingCheck[];
}

const below = (value: number): PacingBound => ({ value, inclusive: false });
const atLeast = (value: number): PacingBound => ({ value, inclusive: true });
const atMost = (value: number): PacingBound => ({ value, inclusive: true });

/** Projektplan §3.5; „–“ in der Tabelle hat keinen Eintrag. */
export const PACING_TARGETS: readonly PacingTarget[] = Object.freeze([
  {
    // „< 10 s“, gemessen als erster Kauf.
    id: 'firstDecision',
    bot: 'active',
    band: { min: null, max: below(10), unit: 'second' },
    window: null,
    checks: [{ measure: 'firstBuy' }],
  },
  {
    // „5–60 s“, erste 30 min: Median der Kauflücken, die Obergrenze auch über die längste Wartezeit.
    id: 'buyInterval',
    bot: 'active',
    band: { min: atLeast(5), max: atMost(60), unit: 'second' },
    window: { value: 30, unit: 'minute' },
    checks: [{ measure: 'buyGapMedian' }, { measure: 'longestWait', upperOnly: true }],
  },
  {
    // „< 5 min“, erste 30 min, über die längste Wartezeit (Game-Design §6.2).
    id: 'buyInterval',
    bot: 'idle',
    band: { min: null, max: below(5), unit: 'minute' },
    window: { value: 30, unit: 'minute' },
    checks: [{ measure: 'longestWait' }],
  },
  {
    id: 'siteDuration',
    bot: 'active',
    band: { min: atLeast(3), max: atMost(15), unit: 'minute' },
    window: null,
    checks: [{ measure: 'siteDuration' }],
  },
  {
    id: 'siteDuration',
    bot: 'idle',
    band: { min: atLeast(10), max: atMost(60), unit: 'minute' },
    window: null,
    checks: [{ measure: 'siteDuration' }],
  },
  {
    // „Längste Durststrecke ohne neue Option“, gemessen als längste Strecke ohne Kauf (§6.2).
    id: 'longestDrought',
    bot: 'active',
    band: { min: null, max: below(10), unit: 'minute' },
    window: null,
    checks: [{ measure: 'longestNoBuy' }],
  },
  {
    id: 'longestDrought',
    bot: 'idle',
    band: { min: null, max: below(60), unit: 'minute' },
    window: null,
    checks: [{ measure: 'longestNoBuy' }],
  },
  {
    // „alle 5–15 min in der ersten Stunde“ über den größten Abstand neuer Optionen (§6.3).
    id: 'newMechanic',
    bot: 'active',
    band: { min: atLeast(5), max: atMost(15), unit: 'minute' },
    window: { value: 60, unit: 'minute' },
    checks: [{ measure: 'unlockGap' }],
  },
] satisfies readonly PacingTarget[]);

const UNIT_MS: Readonly<Record<PacingUnit, number>> = {
  second: MS_PER_SECOND,
  minute: MS_PER_MINUTE,
};

/** Millisekunden je Einheit eines Bands. */
export function pacingUnitMs(unit: PacingUnit): number {
  return UNIT_MS[unit];
}

/** Länge eines Fensters in Millisekunden. */
export function pacingWindowMs(window: PacingWindow): number {
  return window.value * pacingUnitMs(window.unit);
}

/** Liegt `valueMs` im Band? Grenzen nach `inclusive`; `upperOnly` übergeht die Untergrenze. */
export function isWithinBand(valueMs: number, band: PacingBand, upperOnly = false): boolean {
  const unitMs = pacingUnitMs(band.unit);
  const { min, max } = band;
  if (!upperOnly && min !== null) {
    const minMs = min.value * unitMs;
    if (min.inclusive ? valueMs < minMs : valueMs <= minMs) {
      return false;
    }
  }
  if (max !== null) {
    const maxMs = max.value * unitMs;
    if (max.inclusive ? valueMs > maxMs : valueMs >= maxMs) {
      return false;
    }
  }
  return true;
}

/** Zielbänder eines Bots in der Reihenfolge von {@link PACING_TARGETS}. */
export function pacingTargetsFor(bot: string): readonly PacingTarget[] {
  return PACING_TARGETS.filter((target) => target.bot === bot);
}
