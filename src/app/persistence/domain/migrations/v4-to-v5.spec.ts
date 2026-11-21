import { compressToBase64 } from 'lz-string';

import { decodeSave } from '../serialize-logic';
import { migrate, MIGRATIONS } from './migrations-logic';
import { migrateV4ToV5 } from './v4-to-v5';

function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

/** Eingefrorenes rohes Objekt der Version 4 an der ersten Futterstelle (AP 1.5.2). Nicht anpassen. */
const V4_RAW = deepFreeze({
  version: 4,
  seed: 'idleswarm',
  rngState: 3011046983,
  time: { now: 1700000900000, lastSaved: 1700000900000, played: 900000 },
  era: 'ursuppe',
  res: { food: '1.4235e2', dna: '0e0' },
  units: { queens: '2e0', drones: '6.45e1', soldiers: '0e0' },
  site: { type: 'vent', size: '2e4', stock: '6.1e3' },
  bought: { queens: '1e0', drones: '2.4e1', soldiers: '0e0' },
  map: {
    position: { x: 0, y: 0 },
    candidates: [
      {
        type: 'algal-mat',
        position: { x: -3.923380565853229, y: 0.5207710719910827 },
        size: '2.0985931569243e4',
        defense: '0e0',
      },
    ],
    route: [{ type: 'vent', position: { x: 0, y: 0 } }],
    moves: 0,
  },
  travel: null,
  auto: { enabled: false, strategy: 'balanced', threshold: 0 },
  priority: 'balanced',
  pheromones: { drones: 4, soldiers: 1, glands: 1 },
  genome: { owned: [] },
  finds: { rngState: 3125258866, total: 1, collected: { pumice: 1 }, buffs: [] },
});

/** Startzustand von Version 4 (wie nach den zurücksetzenden Migrationen 1 → … → 4). */
const V4_START_RAW = deepFreeze({
  ...V4_RAW,
  res: { food: '1.5e1', dna: '0e0' },
  units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
  site: { type: 'vent', size: '2e4', stock: '2e4' },
  bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
  pheromones: { drones: 3, soldiers: 1, glands: 0 },
  finds: { rngState: 3125258866, total: 0, collected: {}, buffs: [] },
});

const V5_SETTINGS = { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 };

function onboardingOf(raw: object): unknown {
  return migrateV4ToV5(raw as Record<string, unknown>)['onboarding'];
}

describe('migrateV4ToV5', () => {
  it('ist für Version 4 registriert', () => {
    expect(MIGRATIONS[4]).toBe(migrateV4ToV5);
  });

  it('behält den gesamten Fortschritt und ergänzt Einstellungen und Onboarding', () => {
    expect(migrate(V4_RAW, { target: 5 })).toEqual({
      ...V4_RAW,
      version: 5,
      settings: V5_SETTINGS,
      onboarding: {
        unlocked: ['pheromones', 'finds'],
        seenHints: ['collect', 'pheromones', 'finds'],
      },
    });
  });

  it('schaltet im Startzustand nichts frei und lässt alle Hinweise offen', () => {
    expect(onboardingOf(V4_START_RAW)).toEqual({ unlocked: [], seenHints: [] });
  });

  it('zählt eine gekaufte Einheit als Fortschritt für den Start-Hinweis', () => {
    const raw = { ...V4_START_RAW, bought: { ...V4_START_RAW.bought, soldiers: '1e0' } };
    expect(onboardingOf(raw)).toEqual({ unlocked: [], seenHints: ['collect'] });
  });

  it.each([
    ['1e2', true],
    ['9.999e1', false],
  ])('schaltet Pheromone bei Nahrung %s ohne Drüsenpunkt: %s', (food, unlocked) => {
    const raw = { ...V4_START_RAW, res: { food, dna: '0e0' } };
    expect(onboardingOf(raw)).toEqual(
      unlocked
        ? { unlocked: ['pheromones'], seenHints: ['collect', 'pheromones'] }
        : { unlocked: [], seenHints: [] },
    );
  });

  it.each<[string, object]>([
    ['Vorrat genau 25 %', { site: { type: 'vent', size: '2e4', stock: '5e3' } }],
    ['schon gezogen', { map: { ...V4_START_RAW.map, moves: 1 } }],
    ['unterwegs', { travel: { target: V4_RAW.map.candidates[0], remainingMs: 1000 } }],
  ])('schaltet die Umgebung frei: %s', (_name, patch) => {
    expect(onboardingOf({ ...V4_START_RAW, ...patch })).toEqual({
      unlocked: ['map'],
      seenHints: ['collect', 'map', 'auto-move'],
    });
  });

  it('schaltet die Umgebung bei mehr als 25 % Vorrat nicht frei', () => {
    const raw = { ...V4_START_RAW, site: { type: 'vent', size: '2e4', stock: '5.001e3' } };
    expect(onboardingOf(raw)).toEqual({ unlocked: [], seenHints: [] });
  });

  it.each<[string, object]>([
    ['DNA', { res: { food: '1.5e1', dna: '5e-1' } }],
    ['entwickelter Knoten', { genome: { owned: ['cilia-1'] } }],
  ])('schaltet das Genom frei: %s', (_name, patch) => {
    expect(onboardingOf({ ...V4_START_RAW, ...patch })).toEqual({
      unlocked: ['genome'],
      seenHints: ['collect', 'genome'],
    });
  });

  it('schaltet bei vollem Fortschritt alles frei, in Listenreihenfolge', () => {
    const raw = {
      ...V4_RAW,
      res: { food: '1e6', dna: '3e1' },
      map: { ...V4_RAW.map, moves: 4 },
    };
    expect(onboardingOf(raw)).toEqual({
      unlocked: ['pheromones', 'map', 'finds', 'genome'],
      seenHints: ['collect', 'pheromones', 'map', 'finds', 'genome', 'auto-move'],
    });
  });

  it('lehnt einen unlesbaren Stand ab', () => {
    expect(() => migrateV4ToV5({ ...V4_RAW, res: { food: 1, dna: '0e0' } })).toThrow(TypeError);
    expect(() => migrateV4ToV5({ ...V4_RAW, finds: null })).toThrow(TypeError);
    expect(() => migrateV4ToV5({ ...V4_RAW, genome: { owned: {} } })).toThrow(TypeError);
  });

  it('verändert die Eingabe nicht und liefert eigene Teilobjekte', () => {
    const before = JSON.stringify(V4_RAW);
    const first = migrateV4ToV5(V4_RAW);
    const second = migrateV4ToV5(V4_RAW);
    expect(JSON.stringify(V4_RAW)).toBe(before);
    expect(first['settings']).not.toBe(second['settings']);
    expect(Object.isFrozen(first['settings'])).toBe(false);
  });

  it('liefert einen ladbaren Stand der Version 5', () => {
    const state = decodeSave(compressToBase64(JSON.stringify(V4_RAW)));
    expect(state.version).toBe(5);
    expect(state.res.food.eq(142.35)).toBe(true);
    expect(state.onboarding.unlocked).toEqual(['pheromones', 'finds']);
  });
});
