import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type {
  Effect,
  EffectSum,
  Modifiers,
  UnlockEffectTarget,
  ValueEffectTarget,
} from './models/effect.model';
import { UNLOCK_EFFECT_TARGETS, VALUE_EFFECT_TARGETS } from './models/effect.model';

const NEUTRAL_SUM: EffectSum = Object.freeze({ add: 0, mul: 1 });

/** Modifikatoren ohne Effekte: Alle Formeln rechnen damit wie bis M1.2. */
export const NEUTRAL_MODIFIERS: Modifiers = Object.freeze({
  collectRate: NEUTRAL_SUM,
  broodRate: NEUTRAL_SUM,
  findChance: NEUTRAL_SUM,
  combatLoss: NEUTRAL_SUM,
  sacrificeYield: NEUTRAL_SUM,
  range: NEUTRAL_SUM,
  attackPerSoldier: NEUTRAL_SUM,
  spacePerQueen: NEUTRAL_SUM,
  pheromonePoints: NEUTRAL_SUM,
  fallenRecycling: false,
});

/** Erlaubte Operationen je Ziel (Game-Design §4.13, Tabelle der Effektziele). */
const TARGET_OPERATIONS: Readonly<Record<ValueEffectTarget, readonly ('add' | 'mul')[]>> = {
  collectRate: ['add', 'mul'],
  broodRate: ['add', 'mul'],
  findChance: ['add', 'mul'],
  combatLoss: ['mul'],
  sacrificeYield: ['add', 'mul'],
  range: ['add'],
  attackPerSoldier: ['add', 'mul'],
  spacePerQueen: ['add', 'mul'],
  pheromonePoints: ['add'],
};

/** Einziges Ziel mit senkenden Effekten (`mul < 1`) in Ära I. */
const LOWERING_TARGET: ValueEffectTarget = 'combatLoss';

/** Einziges Ziel mit Bedingung in Ära I. */
const CONDITIONAL_TARGET: ValueEffectTarget = 'collectRate';

/**
 * Bedingung `when: { siteType }` gegen den aktuellen Futterstellentyp; `siteType` ist während einer
 * Reise `null`, dann zählt kein bedingter Effekt (Game-Design §4.13).
 */
export function effectApplies(effect: Effect, siteType: SiteTypeId | null): boolean {
  return effect.when === undefined || effect.when.siteType === siteType;
}

/**
 * Verrechnet die Effekte aller Quellen (Game-Design §4.13): je Ziel erst alle `add` summieren, dann
 * mit allen `mul` multiplizieren; die Reihenfolge der Quellen spielt keine Rolle. Ohne wirksamen
 * Effekt kommt {@link NEUTRAL_MODIFIERS} zurück.
 */
export function combineEffects(effects: readonly Effect[], siteType: SiteTypeId | null): Modifiers {
  const active = effects.filter((effect) => effectApplies(effect, siteType));
  if (active.length === 0) {
    return NEUTRAL_MODIFIERS;
  }
  const add = new Map<ValueEffectTarget, number>();
  const mul = new Map<ValueEffectTarget, number>();
  const unlocked = new Set<UnlockEffectTarget>();
  for (const effect of active) {
    switch (effect.op) {
      case 'add':
        add.set(effect.target, (add.get(effect.target) ?? 0) + effect.value);
        break;
      case 'mul':
        mul.set(effect.target, (mul.get(effect.target) ?? 1) * effect.value);
        break;
      case 'unlock':
        unlocked.add(effect.target);
        break;
    }
  }
  const sums = Object.fromEntries(
    VALUE_EFFECT_TARGETS.map((target) => [
      target,
      add.has(target) || mul.has(target)
        ? { add: add.get(target) ?? 0, mul: mul.get(target) ?? 1 }
        : NEUTRAL_SUM,
    ]),
  ) as Record<ValueEffectTarget, EffectSum>;
  const unlocks = Object.fromEntries(
    UNLOCK_EFFECT_TARGETS.map((target) => [target, unlocked.has(target)]),
  ) as Record<UnlockEffectTarget, boolean>;
  return { ...sums, ...unlocks };
}

/**
 * Wert eines Ziels `X = max(0, (X_0 + Σ add) · Π mul)` zum Basiswert `X_0` (Game-Design §4.13). Für
 * die Modifikatoren `M_*` ist `X_0 = 1`.
 */
export function effectValue(base: number, sum: EffectSum): number {
  return Math.max(0, (base + sum.add) * sum.mul);
}

/** Modifikator `M = (1 + Σ add) · Π mul`, nie negativ (Game-Design §4.13). */
export function modifierFactor(sum: EffectSum): number {
  return effectValue(1, sum);
}

/**
 * Datenregel für Effekte (Game-Design §4.13): nur die Operationen des Ziels, `add ≥ 0` (bei
 * Pheromonpunkten ganzzahlig), `mul > 0`, senkend (`mul < 1`) nur und immer bei `combatLoss`,
 * Bedingungen nur bei `collectRate`. Gedacht für die Prüfung der Spieldaten; die Verrechnung selbst
 * sichert abweichende Werte nur mit `max(0, ·)` ab.
 */
export function isValidEffect(effect: Effect): boolean {
  if (effect.op === 'unlock') {
    return effect.when === undefined;
  }
  const { target, op, value, when } = effect;
  if (!TARGET_OPERATIONS[target].includes(op) || !Number.isFinite(value)) {
    return false;
  }
  if (when !== undefined && target !== CONDITIONAL_TARGET) {
    return false;
  }
  if (op === 'add') {
    return value >= 0 && (target !== 'pheromonePoints' || Number.isInteger(value));
  }
  return target === LOWERING_TARGET ? value > 0 && value < 1 : value >= 1;
}
