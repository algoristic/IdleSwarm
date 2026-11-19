import { findsRngState } from '@app/finds/domain/finds-logic';
import { generateCandidates } from '@app/site/domain/generator-logic';

import type { Migration } from './migrations-logic';
import { readRngState, V3_GENERATOR_PARAMS } from './v2-to-v3';

/**
 * Startwerte von Version 4 (Game-Design §2.1 und §5.1). Bewusst feste Literale: Spätere Änderungen
 * an der Balance dürfen das Ergebnis dieser Migration nicht verschieben.
 */
const V4_START = Object.freeze({
  res: Object.freeze({ food: '1.5e1', dna: '0e0' }),
  units: Object.freeze({ queens: '1e0', drones: '0e0', soldiers: '0e0' }),
  site: Object.freeze({ type: 'vent', size: '2e4', stock: '2e4' }),
  bought: Object.freeze({ queens: '0e0', drones: '0e0', soldiers: '0e0' }),
  auto: Object.freeze({ enabled: false, strategy: 'balanced', threshold: 0 }),
  priority: 'balanced',
  pheromones: Object.freeze({ drones: 3, soldiers: 1, glands: 0 }),
});

function readSeed(value: unknown): string {
  if (typeof value !== 'string') {
    throw new TypeError('seed ist kein String');
  }
  return value;
}

/**
 * Seed, RNG-Zustand und Zeiten bleiben, alles Übrige beginnt neu (Game-Design §5.1, wie 2 → 3). Die
 * Startkandidaten entstehen wie in einem neuen Spiel aus dem übernommenen RNG-Zustand, der danach
 * fortgeschrieben gespeichert wird; der Fund-RNG entsteht wie beim neuen Spiel aus dem Seed.
 */
export const migrateV3ToV4: Migration = (raw) => {
  const seed = readSeed(raw['seed']);
  const origin = { x: 0, y: 0 };
  const generated = generateCandidates(
    {
      origin,
      moves: 0,
      range: V3_GENERATOR_PARAMS.baseRange,
      rngState: readRngState(raw['rngState']),
    },
    V3_GENERATOR_PARAMS,
  );
  return {
    ...raw,
    version: 4,
    rngState: generated.rngState,
    res: { ...V4_START.res },
    units: { ...V4_START.units },
    site: { ...V4_START.site },
    bought: { ...V4_START.bought },
    // Über JSON in die Rohform: `Num` wird dabei zum String.
    map: JSON.parse(
      JSON.stringify({
        position: origin,
        candidates: generated.candidates,
        route: [{ type: V4_START.site.type, position: origin }],
        moves: 0,
      }),
    ),
    travel: null,
    auto: { ...V4_START.auto },
    priority: V4_START.priority,
    pheromones: { ...V4_START.pheromones },
    genome: { owned: [] },
    finds: { rngState: findsRngState(seed), total: 0, collected: {}, buffs: [] },
  };
};
