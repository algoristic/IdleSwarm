import type { GameState } from '../state/game-state';

/** Ergebnis einer Ziehung auf dem reinen RNG-Zustand. */
export interface RandomResult {
  /** Zufallswert in `[0, 1)`. */
  readonly value: number;
  /** Nachfolgezustand (uint32). */
  readonly rngState: number;
}

/** Ergebnis einer Ziehung aus dem Spielzustand. */
export interface StateRandomResult {
  /** Zufallswert in `[0, 1)`. */
  readonly value: number;
  /** Neuer Spielzustand mit fortgeschriebenem `rngState`. */
  readonly state: GameState;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const MULBERRY32_INCREMENT = 0x6d2b79f5;
const UINT32_RANGE = 0x100000000;

/**
 * Bildet einen Seed stabil auf einen uint32 ab (FNV-1a über die UTF-16-Codeeinheiten).
 *
 * Spielstände hängen von diesem Ergebnis ab; der Algorithmus darf sich nicht ändern.
 */
export function seedToRngState(seed: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), FNV_PRIME);
  }
  return hash >>> 0;
}

/**
 * Zieht den nächsten Wert (Mulberry32), ohne Seiteneffekte.
 *
 * Spielstände hängen von dieser Folge ab; der Algorithmus darf sich nicht ändern.
 */
export function nextRandom(rngState: number): RandomResult {
  const next = (rngState + MULBERRY32_INCREMENT) >>> 0;
  let t = Math.imul(next ^ (next >>> 15), 1 | next);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE, rngState: next };
}

/** Zieht einen Wert aus dem Spielzustand und liefert den fortgeschriebenen Zustand. */
export function drawRandom(state: GameState): StateRandomResult {
  const { value, rngState } = nextRandom(state.rngState);
  return { value, state: { ...state, rngState } };
}
