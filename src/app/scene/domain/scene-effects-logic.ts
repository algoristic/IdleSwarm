import { nextRandom } from '@app/shared/util/rng/rng';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';

import type { Plankton, SceneParticle } from './models/scene.model';
import { clamp01, MOCKUP_FRAME_MS, positiveModulo } from './scene-agent-logic';

/** Plankton im Hintergrund (Mockup: 120); „Partikel reduzieren“ halbiert. */
export const PLANKTON_COUNT = 120;
export const PLANKTON_COLOR_COUNT = 5;

/** Ertragsteilchen: höchstens so viele je Sekunde, jedes lebt `YIELD_PARTICLE_LIFE_MS`. */
export const YIELD_PARTICLE_MAX_RATE = 12;
export const YIELD_PARTICLE_LIFE_MS = 1200;
const YIELD_PARTICLE_MIN_RATE = 2;
const YIELD_PARTICLE_RATE_PER_DECADE = 2;
const YIELD_RIM_RADIUS = 60;
const YIELD_SPREAD = 50;
const YIELD_RISE = 40;

/** Aufsteigende Blasen über der Futterstelle (Mockup: 6, Zyklus 2,4 s, 160 px Steighöhe). */
export const BUBBLE_COUNT = 6;
const BUBBLE_CYCLE_MS = 2400;
const BUBBLE_RISE = 160;

/** Visueller Zufall des Planktons aus dem Szene-RNG; gibt den neuen RNG-Zustand zurück. */
export function createPlankton(
  count: number,
  rngState: number,
): { readonly plankton: readonly Plankton[]; readonly rngState: number } {
  let state = rngState;
  const random = (min: number, max: number): number => {
    const result = nextRandom(state);
    state = result.rngState;
    return min + result.value * (max - min);
  };
  const plankton = Array.from({ length: count }, (): Plankton => ({
    x: random(0, 1),
    y: random(0, 1),
    depth: random(0.3, 1.5),
    speed: random(0.00005, 0.0003) / MOCKUP_FRAME_MS,
    color: Math.floor(random(0, PLANKTON_COLOR_COUNT)),
    star: random(0, 1) < 0.12,
  }));
  return { plankton, rngState: state };
}

/**
 * Lage eines Planktonteilchens als Viewport-Anteil; es steigt und schwankt seitlich. `driftX` (Anteil)
 * verschiebt das Feld während der Reise.
 */
export function planktonPoint(
  plankton: Plankton,
  nowMs: number,
  driftX: number,
): { readonly x: number; readonly y: number; readonly wobble: number } {
  return {
    x: positiveModulo(plankton.x + driftX * plankton.depth, 1),
    y: positiveModulo(plankton.y - plankton.speed * plankton.depth * nowMs, 1),
    wobble: Math.sin(nowMs / 3000 + plankton.x * 20) * 8,
  };
}

/**
 * Ertragsteilchen je Sekunde: wächst logarithmisch mit der Nahrung/s, gedeckelt; ganze Zahlen,
 * damit sich der Takt nur selten ändert. Ohne Ertrag keine Teilchen.
 */
export function yieldParticleRate(foodPerSecond: number, reduce: boolean): number {
  if (!(foodPerSecond > 0)) {
    return 0;
  }
  const rate = Math.min(
    YIELD_PARTICLE_MAX_RATE,
    Math.round(
      YIELD_PARTICLE_MIN_RATE + YIELD_PARTICLE_RATE_PER_DECADE * Math.log10(1 + foodPerSecond),
    ),
  );
  return reduce ? Math.max(1, Math.round(rate / 2)) : rate;
}

/**
 * Lebende Ertragsteilchen zur Zeit `nowMs`: Teilchen `k` entsteht bei `k · Abstand` und fliegt
 * vom Rand der Futterstelle schräg nach oben. Zustandslos, der Zufall je Teilchen kommt aus
 * `seed` und `k`.
 */
export function yieldParticles(nowMs: number, rate: number, seed: number): SceneParticle[] {
  if (rate <= 0) {
    return [];
  }
  const intervalMs = MS_PER_SECOND / rate;
  const particles: SceneParticle[] = [];
  for (
    let k = Math.floor(nowMs / intervalMs);
    nowMs - k * intervalMs < YIELD_PARTICLE_LIFE_MS;
    k--
  ) {
    const age = clamp01((nowMs - k * intervalMs) / YIELD_PARTICLE_LIFE_MS);
    const first = nextRandom((seed ^ Math.imul(k, 0x9e3779b1)) >>> 0);
    const second = nextRandom(first.rngState);
    const angle = first.value * Math.PI * 2;
    const reach = YIELD_RIM_RADIUS + YIELD_SPREAD * age;
    particles.push({
      x: Math.cos(angle) * reach,
      y: Math.sin(angle) * reach * 0.6 - YIELD_RISE * age,
      size: (2.5 + second.value * 2.5) * (1 - age * 0.5),
      opacity: 1 - age,
    });
  }
  return particles;
}

/** Blase `index` (0 bis `BUBBLE_COUNT − 1`) nach Mockup: steigt, schwankt und verblasst. */
export function bubble(index: number, nowMs: number): SceneParticle {
  const t = positiveModulo(nowMs / BUBBLE_CYCLE_MS + index / BUBBLE_COUNT, 1);
  return {
    x: Math.sin(t * 9 + index) * 12,
    y: -t * BUBBLE_RISE,
    size: 3 + (index % 3),
    opacity: 1 - t,
  };
}
