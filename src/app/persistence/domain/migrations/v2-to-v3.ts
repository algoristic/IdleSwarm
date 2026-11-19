import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { generateCandidates } from '@app/site/domain/generator-logic';

import type { Migration } from './migrations-logic';

const UINT32_LIMIT = 2 ** 32;

/**
 * Startwerte von Version 3 (Game-Design §2.1 und §5). Bewusst feste Literale: Spätere Änderungen
 * an der Balance dürfen das Ergebnis dieser Migration nicht verschieben.
 */
const V3_START = Object.freeze({
  res: Object.freeze({ food: '1.5e1', dna: '0e0' }),
  units: Object.freeze({ queens: '1e0', drones: '0e0', soldiers: '0e0' }),
  site: Object.freeze({ type: 'vent', size: '2e4', stock: '2e4' }),
  bought: Object.freeze({ queens: '0e0', drones: '0e0', soldiers: '0e0' }),
  auto: Object.freeze({ enabled: false, strategy: 'balanced', threshold: 0 }),
  priority: 'balanced',
});

/** Generatorwerte v1 (Game-Design §2.3), ebenfalls fest, damit die Startkandidaten stabil bleiben. */
const V3_GENERATOR_PARAMS: BalanceParams = Object.freeze({
  ...DEFAULT_BALANCE,
  siteSize: 20_000,
  baseRange: 5,
  candidateCount: 6,
  candidateMinDistance: 1,
  candidateMaxDistance: 7,
  siteSizeGrowth: 1.4,
  siteSizeDistanceBonus: 0.1,
  siteDefenseBase: 20,
  siteDefenseGrowth: 1.35,
  siteDefenseDistanceBonus: 0.15,
  siteSpread: 0.2,
  algalMatSizeFactor: 0.5,
  algalMatDefenseFactor: 0,
  algalMatWeight: 1,
  ventSizeFactor: 1,
  ventDefenseFactor: 1,
  ventWeight: 1,
  bacterialMatSizeFactor: 1.5,
  bacterialMatDefenseFactor: 2.5,
  bacterialMatWeight: 1,
  methaneSeepSizeFactor: 2.5,
  methaneSeepDefenseFactor: 2,
  methaneSeepWeight: 1,
  whaleFallSizeFactor: 3,
  whaleFallDefenseFactor: 3,
  whaleFallWeight: 1,
});

function readRngState(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= UINT32_LIMIT) {
    throw new TypeError('rngState ist kein uint32');
  }
  return value;
}

/**
 * Seed, RNG-Zustand und Zeiten bleiben, alles Übrige beginnt neu (Game-Design §5). Die
 * Startkandidaten entstehen wie in einem neuen Spiel aus dem übernommenen RNG-Zustand, der danach
 * fortgeschrieben gespeichert wird.
 */
export const migrateV2ToV3: Migration = (raw) => {
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
    version: 3,
    rngState: generated.rngState,
    res: { ...V3_START.res },
    units: { ...V3_START.units },
    site: { ...V3_START.site },
    bought: { ...V3_START.bought },
    // Über JSON in die Rohform: `Num` wird dabei zum String.
    map: JSON.parse(
      JSON.stringify({
        position: origin,
        candidates: generated.candidates,
        route: [{ type: V3_START.site.type, position: origin }],
        moves: 0,
      }),
    ),
    travel: null,
    auto: { ...V3_START.auto },
    priority: V3_START.priority,
  };
};
