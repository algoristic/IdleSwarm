import { migrate, MIGRATIONS } from './migrations-logic';
import { migrateV1ToV2 } from './v1-to-v2';

/** Eingefrorenes rohes Objekt der Version 1. Nicht anpassen. */
const V1_RAW = Object.freeze({
  version: 1,
  seed: 'idleswarm',
  rngState: 1378881061,
  time: Object.freeze({ now: 1700000360000, lastSaved: 1700000300000, played: 360000 }),
  era: 'ursuppe',
  res: Object.freeze({ food: '1.284e3', dna: '7.5e0' }),
  units: Object.freeze({ queens: '3e0', drones: '4.2e1', soldiers: '1.5e1000000' }),
});

/** Erwartetes Ergebnis als Literal, unabhängig von den aktuellen Balance-Werten. */
const V2_EXPECTED = {
  version: 2,
  seed: 'idleswarm',
  rngState: 1378881061,
  time: { now: 1700000360000, lastSaved: 1700000300000, played: 360000 },
  era: 'ursuppe',
  res: { food: '1.5e1', dna: '0e0' },
  units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
  site: { type: 'vent', size: '2e4', stock: '2e4' },
  bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
};

describe('migrateV1ToV2', () => {
  it('ist für Version 1 registriert', () => {
    expect(MIGRATIONS[1]).toBe(migrateV1ToV2);
  });

  it('erhält Seed, RNG-Zustand und Zeiten und setzt alles Übrige auf die Startwerte', () => {
    expect(migrate(V1_RAW, { target: 2 })).toEqual(V2_EXPECTED);
  });

  it('verändert die Eingabe nicht', () => {
    const before = JSON.stringify(V1_RAW);
    migrateV1ToV2(V1_RAW);
    expect(JSON.stringify(V1_RAW)).toBe(before);
  });

  it('liefert bei jedem Aufruf eigene Teilobjekte', () => {
    const first = migrateV1ToV2(V1_RAW);
    const second = migrateV1ToV2(V1_RAW);
    expect(first['site']).not.toBe(second['site']);
    expect(Object.isFrozen(first['site'])).toBe(false);
  });
});
