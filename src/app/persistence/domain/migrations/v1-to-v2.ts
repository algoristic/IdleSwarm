import type { Migration } from './migrations-logic';

/**
 * Startwerte von Version 2 (Game-Design §2.1 und §5). Bewusst feste Literale: Spätere Änderungen
 * an der Balance dürfen das Ergebnis dieser Migration nicht verschieben.
 */
const V2_START = Object.freeze({
  res: Object.freeze({ food: '1.5e1', dna: '0e0' }),
  units: Object.freeze({ queens: '1e0', drones: '0e0', soldiers: '0e0' }),
  site: Object.freeze({ type: 'vent', size: '2e4', stock: '2e4' }),
  bought: Object.freeze({ queens: '0e0', drones: '0e0', soldiers: '0e0' }),
});

/** Seed, RNG-Zustand und Zeiten bleiben, alles Übrige beginnt neu (Game-Design §5). */
export const migrateV1ToV2: Migration = (raw) => ({
  ...raw,
  version: 2,
  res: { ...V2_START.res },
  units: { ...V2_START.units },
  site: { ...V2_START.site },
  bought: { ...V2_START.bought },
});
