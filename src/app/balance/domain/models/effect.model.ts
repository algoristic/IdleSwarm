import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

/**
 * Effektziele mit Zahl (Game-Design §4.13, stabile IDs): Modifikatoren `M_*` mit Basiswert 1 und
 * Werte mit Basiswert aus `params` (`R_0`, `a_s`, `p_q`) bzw. 0 (`P_bonus`).
 */
export const VALUE_EFFECT_TARGETS = [
  'collectRate',
  'broodRate',
  'findChance',
  'combatLoss',
  'sacrificeYield',
  'range',
  'attackPerSoldier',
  'spacePerQueen',
  'pheromonePoints',
] as const;

export type ValueEffectTarget = (typeof VALUE_EFFECT_TARGETS)[number];

/** Effektziele, die eine Regel einschalten (Game-Design §4.13). */
export const UNLOCK_EFFECT_TARGETS = ['fallenRecycling'] as const;

export type UnlockEffectTarget = (typeof UNLOCK_EFFECT_TARGETS)[number];

export const EFFECT_TARGETS = [...VALUE_EFFECT_TARGETS, ...UNLOCK_EFFECT_TARGETS] as const;

export type EffectTarget = (typeof EFFECT_TARGETS)[number];

export const EFFECT_OPERATIONS = ['add', 'mul', 'unlock'] as const;

export type EffectOperation = (typeof EFFECT_OPERATIONS)[number];

/** Der Effekt zählt nur, solange der Schwarm an einer Futterstelle dieses Typs steht und nicht reist. */
export interface EffectCondition {
  readonly siteType: SiteTypeId;
}

/** `add` addiert `value` zum Basiswert, `mul` multipliziert mit `value` (Game-Design §4.13). */
export interface ValueEffect {
  readonly target: ValueEffectTarget;
  readonly op: 'add' | 'mul';
  readonly value: number;
  readonly when?: EffectCondition;
}

/** Schaltet eine Regel ein; mehrere Quellen derselben Freischaltung wirken wie eine. */
export interface UnlockEffect {
  readonly target: UnlockEffectTarget;
  readonly op: 'unlock';
  readonly when?: EffectCondition;
}

export type Effect = ValueEffect | UnlockEffect;

/** Summe aller `add` und Produkt aller `mul` eines Ziels; neutral `{ add: 0, mul: 1 }`. */
export interface EffectSum {
  readonly add: number;
  readonly mul: number;
}

/**
 * Verrechnete Effekte aller Quellen, je Ziel. Wird bei jeder Berechnung aus dem Zustand abgeleitet
 * und nie gespeichert (Game-Design §4.13).
 */
export type Modifiers = Readonly<Record<ValueEffectTarget, EffectSum>> &
  Readonly<Record<UnlockEffectTarget, boolean>>;
