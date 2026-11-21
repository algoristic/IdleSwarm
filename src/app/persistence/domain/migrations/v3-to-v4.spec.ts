import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { createInitialState } from '@app/engine/domain/game-state-logic';

import { migrate, MIGRATIONS } from './migrations-logic';
import { migrateV3ToV4 } from './v3-to-v4';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Eingefrorenes rohes Objekt der Version 3 mitten in der zweiten Reise (AP 1.2.6). Nicht anpassen. */
const V3_RAW = deepFreeze({
  version: 3,
  seed: 'idleswarm',
  rngState: 3898647441,
  time: { now: 1700000039000, lastSaved: 1700000039000, played: 39000 },
  era: 'ursuppe',
  res: { food: '3.260472615368e2', dna: '0e0' },
  units: { queens: '1e0', drones: '3.925e0', soldiers: '1.975e0' },
  site: { type: 'algal-mat', size: '1.79670415338958e4', stock: '0e0' },
  bought: { queens: '0e0', drones: '1e0', soldiers: '1e0' },
  map: {
    position: { x: -1.3355202136377915, y: -2.3790464257738426 },
    candidates: [
      {
        type: 'vent',
        position: { x: -2.753087892097292, y: 4.252482481148215 },
        size: '6.6733513737116e4',
        defense: '5.5e1',
      },
      {
        type: 'algal-mat',
        position: { x: -3.923380565853229, y: 0.5207710719910827 },
        size: '2.0985931569243e4',
        defense: '0e0',
      },
    ],
    route: [
      { type: 'vent', position: { x: 0, y: 0 } },
      { type: 'algal-mat', position: { x: -1.3355202136377915, y: -2.3790464257738426 } },
    ],
    moves: 1,
  },
  travel: {
    target: {
      type: 'algal-mat',
      position: { x: -3.923380565853229, y: 0.5207710719910827 },
      size: '2.0985931569243e4',
      defense: '0e0',
    },
    remainingMs: 34866.39000847936,
  },
  auto: { enabled: false, strategy: 'least-resistance', threshold: 0.25 },
  priority: 'soldiers-first',
});

/**
 * Erwartetes Ergebnis als Literal, unabhängig von den aktuellen Balance-Werten. Der RNG-Zustand ist
 * um die 30 Ziehungen der Startkandidaten fortgeschrieben (`3898647441 + 30 · 0x6d2b79f5 mod 2^32`),
 * der Fund-RNG ist FNV-1a von „idleswarm#finds“.
 */
const V4_EXPECTED = {
  version: 4,
  seed: 'idleswarm',
  rngState: 3011046983,
  time: { now: 1700000039000, lastSaved: 1700000039000, played: 39000 },
  era: 'ursuppe',
  res: { food: '1.5e1', dna: '0e0' },
  units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
  site: { type: 'vent', size: '2e4', stock: '2e4' },
  bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
  map: {
    position: { x: 0, y: 0 },
    candidates: expect.any(Array),
    route: [{ type: 'vent', position: { x: 0, y: 0 } }],
    moves: 0,
  },
  travel: null,
  auto: { enabled: false, strategy: 'balanced', threshold: 0 },
  priority: 'balanced',
  pheromones: { drones: 3, soldiers: 1, glands: 0 },
  genome: { owned: [] },
  finds: { rngState: 3125258866, total: 0, collected: {}, buffs: [] },
};

describe('migrateV3ToV4', () => {
  it('ist für Version 3 registriert', () => {
    expect(MIGRATIONS[3]).toBe(migrateV3ToV4);
  });

  it('erhält Seed und Zeiten und setzt alles Übrige auf die Startwerte von Version 4', () => {
    expect(migrate(V3_RAW, { target: 4 })).toEqual(V4_EXPECTED);
  });

  it('erzeugt die Startkandidaten wie ein neues Spiel aus dem übernommenen RNG-Zustand', () => {
    const migrated = migrateV3ToV4(V3_RAW);
    const fresh = createInitialState(
      { seed: 'idleswarm', now: 0, rngState: 3898647441 },
      BALANCE_V1,
    );
    expect(migrated['map']).toEqual(JSON.parse(JSON.stringify(fresh.map)));
    expect(migrated['rngState']).toBe(fresh.rngState);
    expect(migrated['finds']).toEqual(fresh.finds);
  });

  it('erzeugt aus einem anderen RNG-Zustand andere Kandidaten, den Fund-RNG aber aus dem Seed', () => {
    const other = migrateV3ToV4({ ...V3_RAW, rngState: 3 });
    expect(other['map']).not.toEqual(migrateV3ToV4(V3_RAW)['map']);
    expect(other['finds']).toEqual(V4_EXPECTED.finds);
  });

  it('lehnt einen ungültigen RNG-Zustand oder Seed ab', () => {
    expect(() => migrateV3ToV4({ ...V3_RAW, rngState: -1 })).toThrow(TypeError);
    expect(() => migrateV3ToV4({ ...V3_RAW, rngState: '1' })).toThrow(TypeError);
    expect(() => migrateV3ToV4({ ...V3_RAW, seed: 42 })).toThrow(TypeError);
  });

  it('verändert die Eingabe nicht', () => {
    const before = JSON.stringify(V3_RAW);
    migrateV3ToV4(V3_RAW);
    expect(JSON.stringify(V3_RAW)).toBe(before);
  });

  it('liefert bei jedem Aufruf eigene Teilobjekte', () => {
    const first = migrateV3ToV4(V3_RAW);
    const second = migrateV3ToV4(V3_RAW);
    expect(first['pheromones']).not.toBe(second['pheromones']);
    expect(first['genome']).not.toBe(second['genome']);
    expect(first['finds']).not.toBe(second['finds']);
    expect(Object.isFrozen(first['pheromones'])).toBe(false);
  });
});
