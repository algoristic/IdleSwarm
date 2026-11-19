import { migrate, MIGRATIONS } from './migrations-logic';
import { migrateV2ToV3 } from './v2-to-v3';

/** Eingefrorenes rohes Objekt der Version 2. Nicht anpassen. */
const V2_RAW = Object.freeze({
  version: 2,
  seed: 'idleswarm',
  rngState: 1378881061,
  time: Object.freeze({ now: 1700000005000, lastSaved: 1700000000000, played: 5000 }),
  era: 'ursuppe',
  res: Object.freeze({ food: '1.284e3', dna: '7.5e0' }),
  units: Object.freeze({ queens: '3e0', drones: '4.2e1', soldiers: '1.5e0' }),
  site: Object.freeze({ type: 'vent', size: '2e4', stock: '1.2345e3' }),
  bought: Object.freeze({ queens: '2e0', drones: '4e1', soldiers: '0e0' }),
});

/**
 * Erwartetes Ergebnis als Literal, unabhängig von den aktuellen Balance-Werten. Die Kandidaten
 * stimmen mit einer unabhängigen Nachrechnung von Game-Design §4.6 für den RNG-Zustand 1378881061
 * überein (siehe `generator-logic.spec.ts`); der RNG-Zustand ist um 30 Ziehungen fortgeschrieben.
 */
const V3_EXPECTED = {
  version: 3,
  seed: 'idleswarm',
  rngState: 491280603,
  time: { now: 1700000005000, lastSaved: 1700000000000, played: 5000 },
  era: 'ursuppe',
  res: { food: '1.5e1', dna: '0e0' },
  units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
  site: { type: 'vent', size: '2e4', stock: '2e4' },
  bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
  map: {
    position: { x: 0, y: 0 },
    candidates: [
      {
        type: 'algal-mat',
        position: { x: -1.3355202136377915, y: -2.3790464257738426 },
        size: '1.79670415338958e4',
        defense: '0e0',
      },
      {
        type: 'methane-seep',
        position: { x: -3.2936335964869192, y: -4.688101489350915 },
        size: '1.10733056513213e5',
        defense: '5.6e1',
      },
      {
        type: 'whale-fall',
        position: { x: 0.7162878261553868, y: 1.0509646791325267 },
        size: '7.19186709888971e4',
        defense: '6e1',
      },
      {
        type: 'bacterial-mat',
        position: { x: 0.8020028659923746, y: 2.6904133133093184 },
        size: '4.52181078065995e4',
        defense: '6.2e1',
      },
      {
        type: 'bacterial-mat',
        position: { x: -2.848285382030026, y: -1.0363895376847796 },
        size: '5.94366171955181e4',
        defense: '5.5e1',
      },
      {
        type: 'whale-fall',
        position: { x: 2.004733641282041, y: 0.6885980701326586 },
        size: '8.72118422619159e4',
        defense: '6e1',
      },
    ],
    route: [{ type: 'vent', position: { x: 0, y: 0 } }],
    moves: 0,
  },
  travel: null,
  auto: { enabled: false, strategy: 'balanced', threshold: 0 },
  priority: 'balanced',
};

describe('migrateV2ToV3', () => {
  it('ist für Version 2 registriert', () => {
    expect(MIGRATIONS[2]).toBe(migrateV2ToV3);
  });

  it('erhält Seed und Zeiten, setzt alles Übrige auf die Startwerte und erzeugt die Kandidaten', () => {
    expect(migrate(V2_RAW, { target: 3 })).toEqual(V3_EXPECTED);
  });

  it('erzeugt aus einem anderen RNG-Zustand andere Kandidaten, wie ein neues Spiel', () => {
    const other = migrateV2ToV3({ ...V2_RAW, rngState: 3 });
    expect(other['map']).not.toEqual(V3_EXPECTED.map);
    expect(other['seed']).toBe('idleswarm');
  });

  it('lehnt einen ungültigen RNG-Zustand ab', () => {
    expect(() => migrateV2ToV3({ ...V2_RAW, rngState: -1 })).toThrow(TypeError);
    expect(() => migrateV2ToV3({ ...V2_RAW, rngState: '1' })).toThrow(TypeError);
  });

  it('verändert die Eingabe nicht', () => {
    const before = JSON.stringify(V2_RAW);
    migrateV2ToV3(V2_RAW);
    expect(JSON.stringify(V2_RAW)).toBe(before);
  });

  it('liefert bei jedem Aufruf eigene Teilobjekte', () => {
    const first = migrateV2ToV3(V2_RAW);
    const second = migrateV2ToV3(V2_RAW);
    expect(first['map']).not.toBe(second['map']);
    expect(first['auto']).not.toBe(second['auto']);
    expect(Object.isFrozen(first['auto'])).toBe(false);
  });
});
