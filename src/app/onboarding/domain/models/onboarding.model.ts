/**
 * Stabile IDs der Teile, die erst erscheinen, wenn sie relevant werden (US-09.04, Game-Design §4.18).
 * Die Reihenfolge ist die Reihenfolge im Spielstand.
 */
export const ONBOARDING_UNLOCK_IDS = ['pheromones', 'map', 'finds', 'genome'] as const;
export type OnboardingUnlockId = (typeof ONBOARDING_UNLOCK_IDS)[number];

/** Stabile IDs der Hinweise; jeder erscheint einmal und ist wegklickbar (US-09.04). */
export const HINT_IDS = ['collect', 'pheromones', 'map', 'finds', 'genome', 'auto-move'] as const;
export type HintId = (typeof HINT_IDS)[number];

/**
 * Freischaltung, zu der ein Hinweis gehört; `null` für den Start-Hinweis. Wann `auto-move` innerhalb
 * der freigeschalteten Umgebung erscheint (erstes Öffnen), entscheidet die Oberfläche.
 */
export const HINT_UNLOCKS: Readonly<Record<HintId, OnboardingUnlockId | null>> = Object.freeze({
  collect: null,
  pheromones: 'pheromones',
  map: 'map',
  finds: 'finds',
  genome: 'genome',
  'auto-move': 'map',
});

/**
 * Onboarding-Fortschritt im Spielstand (Game-Design §5.2). Beide Listen ohne Doppelte, in der
 * Reihenfolge von {@link ONBOARDING_UNLOCK_IDS} bzw. {@link HINT_IDS}; Freischaltungen sind monoton.
 */
export interface Onboarding {
  readonly unlocked: readonly OnboardingUnlockId[];
  readonly seenHints: readonly HintId[];
}

export function isOnboardingUnlockId(value: unknown): value is OnboardingUnlockId {
  return (ONBOARDING_UNLOCK_IDS as readonly unknown[]).includes(value);
}

export function isHintId(value: unknown): value is HintId {
  return (HINT_IDS as readonly unknown[]).includes(value);
}
