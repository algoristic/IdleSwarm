import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import type { HintId } from '@app/onboarding/domain/models/onboarding.model';
import {
  hintsOfUnlocks,
  reachedUnlocks,
  UnlockProgress,
} from '@app/onboarding/domain/onboarding-logic';
import { Num } from '@app/shared/util/num/num';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';

import type { Migration } from './migrations-logic';

/**
 * Werte der Freischaltregeln von Version 5 (Game-Design §2.3, §4.18). Bewusst feste Literale:
 * Spätere Änderungen an der Balance dürfen das Ergebnis dieser Migration nicht verschieben.
 */
export const V5_UNLOCK_PARAMS: BalanceParams = Object.freeze({
  ...DEFAULT_BALANCE,
  glandCost: 100,
  glandCostGrowth: 2,
  mapUnlockStockShare: 0.25,
});

/** Standard-Einstellungen von Version 5 (Game-Design §5.2), als Literale. */
const V5_SETTINGS = Object.freeze({
  numberFormat: 'short',
  motion: 'system',
  autosaveIntervalMs: 30 * MS_PER_SECOND,
});

function record(value: unknown, path: string): Readonly<Record<string, unknown>> {
  // Eigene Prüfung statt `isRecord`: kein Laufzeit-Import aus `migrations-logic` (Zyklus).
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${path} ist kein Objekt`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function amount(value: unknown, path: string): Num {
  if (typeof value !== 'string') {
    throw new TypeError(`${path} ist kein String`);
  }
  return Num.from(value);
}

function count(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new TypeError(`${path} ist keine ganze Zahl ≥ 0`);
  }
  return value;
}

function length(value: unknown, path: string): number {
  if (!Array.isArray(value)) {
    throw new TypeError(`${path} ist keine Liste`);
  }
  return value.length;
}

/** Liest aus dem rohen v4-Stand, was die Freischaltregeln brauchen; geprüft wird danach beim Laden. */
function readProgress(raw: Readonly<Record<string, unknown>>): UnlockProgress {
  const res = record(raw['res'], 'res');
  const site = record(raw['site'], 'site');
  const map = record(raw['map'], 'map');
  const pheromones = record(raw['pheromones'], 'pheromones');
  return {
    food: amount(res['food'], 'res.food'),
    dna: amount(res['dna'], 'res.dna'),
    siteSize: amount(site['size'], 'site.size'),
    siteStock: amount(site['stock'], 'site.stock'),
    moved: raw['travel'] !== null || count(map['moves'], 'map.moves') > 0,
    pheromones: {
      drones: count(pheromones['drones'], 'pheromones.drones'),
      soldiers: count(pheromones['soldiers'], 'pheromones.soldiers'),
      glands: count(pheromones['glands'], 'pheromones.glands'),
    },
    ownedNodes: length(record(raw['genome'], 'genome')['owned'], 'genome.owned'),
    findsTotal: count(record(raw['finds'], 'finds')['total'], 'finds.total'),
  };
}

/** Fortschritt für den Start-Hinweis: eine gekaufte Einheit oder schon ein freigeschalteter Teil. */
function hasProgress(
  raw: Readonly<Record<string, unknown>>,
  unlocked: readonly unknown[],
): boolean {
  const bought = record(raw['bought'], 'bought');
  const anyBought = ['queens', 'drones', 'soldiers'].some((unit) =>
    amount(bought[unit], `bought.${unit}`).gt(Num.ZERO),
  );
  return anyBought || unlocked.length > 0;
}

/**
 * Behält den gesamten Fortschritt (Game-Design §5.2). Ergänzt die Standard-Einstellungen und das
 * Onboarding: freigeschaltet ist, was der Stand schon erreicht hat; deren Hinweise gelten als
 * gesehen, der Start-Hinweis auch, sobald der Stand Fortschritt hat.
 */
export const migrateV4ToV5: Migration = (raw) => {
  const unlocked = reachedUnlocks([], readProgress(raw), V5_UNLOCK_PARAMS);
  const seenHints: HintId[] = [
    ...(hasProgress(raw, unlocked) ? (['collect'] as const) : []),
    ...hintsOfUnlocks(unlocked),
  ];
  return {
    ...raw,
    version: 5,
    settings: { ...V5_SETTINGS },
    onboarding: { unlocked: [...unlocked], seenHints },
  };
};
