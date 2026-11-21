import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { glandPrice, isAffordable } from '@app/balance/domain/formulas';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';

import {
  HINT_IDS,
  HINT_UNLOCKS,
  HintId,
  isHintId,
  Onboarding,
  ONBOARDING_UNLOCK_IDS,
  OnboardingUnlockId,
} from './models/onboarding.model';

/** Onboarding eines neuen Spiels: nichts freigeschaltet, kein Hinweis gesehen. */
export const START_ONBOARDING: Onboarding = Object.freeze({
  unlocked: Object.freeze([]),
  seenHints: Object.freeze([]),
});

/**
 * Was die Freischaltregeln lesen (Game-Design §4.18). Eigene Form statt `GameState`, damit die
 * Migration 4 → 5 sie aus dem rohen Stand füllen kann.
 */
export interface UnlockProgress {
  readonly food: Num;
  readonly dna: Num;
  readonly siteSize: Num;
  readonly siteStock: Num;
  /** Schon weitergezogen (`map.moves > 0`) oder unterwegs. */
  readonly moved: boolean;
  readonly pheromones: Pheromones;
  readonly ownedNodes: number;
  readonly findsTotal: number;
}

export function unlockProgress(state: GameState): UnlockProgress {
  return {
    food: state.res.food,
    dna: state.res.dna,
    siteSize: state.site.size,
    siteStock: state.site.stock,
    moved: state.travel !== null || state.map.moves > 0,
    pheromones: state.pheromones,
    ownedNodes: state.genome.owned.length,
    findsTotal: state.finds.total,
  };
}

/** Freischaltregel je Teil (Game-Design §4.18). */
export function isUnlockReached(
  id: OnboardingUnlockId,
  progress: UnlockProgress,
  params: BalanceParams = DEFAULT_BALANCE,
): boolean {
  switch (id) {
    case 'pheromones':
      return (
        progress.pheromones.glands > 0 ||
        isAffordable(glandPrice(progress.pheromones, params), progress.food)
      );
    case 'map':
      return (
        progress.moved || progress.siteStock.lte(progress.siteSize.mul(params.mapUnlockStockShare))
      );
    case 'finds':
      return progress.findsTotal > 0;
    case 'genome':
      return progress.dna.gt(Num.ZERO) || progress.ownedNodes > 0;
  }
}

/**
 * Bisherige plus neu erreichte Freischaltungen in Listenreihenfolge. Kommt nichts dazu, kommt
 * dieselbe Liste zurück; einmal Freigeschaltetes bleibt (monoton).
 */
export function reachedUnlocks(
  unlocked: readonly OnboardingUnlockId[],
  progress: UnlockProgress,
  params: BalanceParams = DEFAULT_BALANCE,
): readonly OnboardingUnlockId[] {
  const added = ONBOARDING_UNLOCK_IDS.filter(
    (id) => !unlocked.includes(id) && isUnlockReached(id, progress, params),
  );
  if (added.length === 0) {
    return unlocked;
  }
  return ONBOARDING_UNLOCK_IDS.filter((id) => unlocked.includes(id) || added.includes(id));
}

/**
 * Schaltet frei, was der Zustand erreicht hat; läuft nach jedem Schritt und nach jedem wirksamen
 * Kommando. Ändert sich nichts, kommt derselbe Zustand zurück (stabile Referenzen im Takt).
 */
export function updateUnlocks(
  state: GameState,
  params: BalanceParams = DEFAULT_BALANCE,
): GameState {
  const { onboarding } = state;
  if (onboarding.unlocked.length === ONBOARDING_UNLOCK_IDS.length) {
    return state;
  }
  const unlocked = reachedUnlocks(onboarding.unlocked, unlockProgress(state), params);
  return unlocked === onboarding.unlocked
    ? state
    : { ...state, onboarding: { ...onboarding, unlocked } };
}

export function isUnlocked(onboarding: Onboarding, id: OnboardingUnlockId): boolean {
  return onboarding.unlocked.includes(id);
}

/** Ein Hinweis ist verfügbar, sobald sein Teil freigeschaltet ist; der Start-Hinweis immer. */
export function isHintAvailable(onboarding: Onboarding, hint: HintId): boolean {
  const unlock = HINT_UNLOCKS[hint];
  return unlock === null || onboarding.unlocked.includes(unlock);
}

/** Verfügbare, noch nicht gesehene Hinweise in Listenreihenfolge. */
export function pendingHints(onboarding: Onboarding): readonly HintId[] {
  return HINT_IDS.filter(
    (hint) => !onboarding.seenHints.includes(hint) && isHintAvailable(onboarding, hint),
  );
}

/** Hinweise der angegebenen Freischaltungen, in Listenreihenfolge (ohne den Start-Hinweis). */
export function hintsOfUnlocks(unlocked: readonly OnboardingUnlockId[]): readonly HintId[] {
  return HINT_IDS.filter((hint) => {
    const unlock = HINT_UNLOCKS[hint];
    return unlock !== null && unlocked.includes(unlock);
  });
}

/** Markiert einen Hinweis als gesehen; unbekannt oder schon gesehen: dasselbe Objekt. */
export function markHintSeen(onboarding: Onboarding, hint: HintId): Onboarding {
  if (!isHintId(hint) || onboarding.seenHints.includes(hint)) {
    return onboarding;
  }
  const seenHints = HINT_IDS.filter((id) => id === hint || onboarding.seenHints.includes(id));
  return { ...onboarding, seenHints };
}

/** Setzt alle Hinweise zurück (Einstellungen); Freischaltungen bleiben. */
export function resetHints(onboarding: Onboarding): Onboarding {
  return onboarding.seenHints.length === 0 ? onboarding : { ...onboarding, seenHints: [] };
}
