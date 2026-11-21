import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState, STATE_VERSION } from '@app/engine/domain/models/game-state.model';
import { step } from '@app/engine/domain/step-logic';
import { DEFAULT_SETTINGS, NumberFormat } from '@app/settings/domain/models/settings.model';
import { Num } from '@app/shared/util/num/num';

import { decodeSave, encodeSave, importSave, SaveError } from './serialize-logic';

/**
 * Eingefrorener Spielstand der Version 1 (technisches Konzept §10). Nicht anpassen: Er muss auch
 * nach künftigen Formatänderungen ladbar bleiben.
 */
const FROZEN_V1_SAVE =
  'N4IgbgpgTgzglgewHYgFwEYA0IYQgEzRDnwBsIYB3AQygFsRsokBzAZQBdqOI10BmAOwAOUegAMANiwgOcOr1SgkCSn0HjNm/pK3jspajA5tqkQhg17+e/SAAOhgJ4E0OvQF9s0akQCusH729rxMFGigAGYICBYg6AB0AEzCACwQ/Iwg+Ei+qCCCCQCsEOIgXiB+SHAcMBEgAI5+eEh1+fylWfhQyOH5qckQ6FkwCKT4cNBt8cVDtmUeHkA=';

/**
 * Eingefrorener Spielstand der Version 2 aus der Zeit vor dem Klick-Ausbau (AP 1.1.9). Nicht
 * anpassen: Version 2 gilt ohne Migration weiter, der Stand muss unverändert ladbar bleiben.
 */
const FROZEN_V2_SAVE =
  'N4IgbgpgTgzglgewHYgFwCYA0IYQgEzRDnwBsIYB3AQygFsRsokBzAZQBdqOI0BGAMwB2ABxi+ABgBsfbBzh1eqUEgSV+QiVu0SArNuylqMDm2qRCqPpp22J2AA5GAngTT6tAX2zRqRAK6w/g4OvEwUaKAAZggIliB8AHToIgAsEAKMIPhIfqggQom6EBIg3iD+SHAcMJEgAI7+eEi1+QIlWfhQyBH5qckQfFkwCKT4cNCtCUUd5fA8dRzOoUSQSBzDcABeSiDoEKnDHAgAxgDWREnoAqnFmeUARgj+LAAWG8oNTRAtRPul2C6PSm6SG2BGYwmsCIElmniAA';

/**
 * Eingefrorener Spielstand der Version 3 mitten in der zweiten Reise (AP 1.2.6), mit Route,
 * Einstellungen und Mitnahme-Priorität. Nicht anpassen: Vorlage für künftige Migrationen.
 */
const FROZEN_V3_SAVE =
  'N4IgbgpgTgzglgewHYgFwGYA0IYQgEzRDnwBsIYB3AQygFsRsokBzAZQBdqOI10AOAJz8AbABYA7GLEBGbBzh1eqUEgS' +
  'U0MiQAZde9IL3ZS1GBzbVIhVFr37Du7AAcTATwJ8H2gL7Zo1IgBXWECnJ14mCjRQADMEBGsQdAA6ACYRbUl0mQBWdBF+' +
  'CFTGEHwkANQQbQhtEF8QQKQ4DhhokABHQLwkVsqZGpL8KGQoypTBVJyB7BgEUnw4aF6QGWTBCSna+vgeNo5XcKJqUhZj' +
  'gFo6bhL4AC9lFeSJQREdWTyBQRzCsWuOBABjADWRGqW2wACMEIEWAALDhtTrdZagwbDJCjFbTHBzBZLIj9MEgS5ONpOB' +
  'A7RAoFQgAAeaDOq3Q6ByOVS2lSMny6AkT1y2Fc9NSyW5hjE4kmPIEYnS9X+1CQC3w3FGAG1QPtDpVIEh4c5yc1KW06ag' +
  'zkKNuhtPwJEI2etUhN+WgxGlWWJ+Kk3TIZG6OTltnA7kQRMkXkycpyJNyvSIID9sPgIDEID17jlklMZHVMOqDvdjqdSB' +
  'crnqKcgjfTxqkmfxtDkRF88ql7Y7UNp02yeTJtBIZIJBF33RJ/YHKkLtMIcoJ0LkRBMxOhY4NE8ncCCBr4c5qiRAODD5' +
  'RAzrgICSSway9TjW3OTIrZGZCIXtbJFIW2cUlJXWL2W6JBz0MP7lWJsmXNaQxByHt+hyJckxTIg0zECBMw3EANXucFqH' +
  '+HgoDgc5Ll1EAyVLKlQGNM422nbRcnSKcHzFL0sBAAUTX4NZu1nD1xw9GsOQAogJGSedxAMVJBwEdBELjUplzgvpBKmY' +
  'oULQogMKw6BcMLfCSiIs8SNpQUQybURRO9fIIPWHIW2decvXAqjpRybQClrPjKlYi1+05V1WVnBcpITWDVzkyQiizTc8' +
  'xOPDi0I/UFHPUi0DHesdCo0QJOtCdXxSHIxAs/h+C9dIxWeVyQCFCT8p9Kj7y0VJF3jGSgqqdcAF0mChXZUDVVDcyIbU' +
  'CJ0uK9MvFsfCU3rKnzKKBtiw0L3pRlmVZdlOREbleUspiDJFTJxQgyN+GlERvG8NqiQQSBehkeoOCgSwIFIPZaBYHc9g' +
  'mkAps06LBrmhKTUrata3rfhG2bLbW3bbse27Xt+0tVIhxmAN7jHCcpxnOc/Jgld7hReooAgS44CaVgAFlegqh9hS8Q6n' +
  'nyepqECP42mTahwXIawYmOXAZlu5UWGYkByFMDgzgJ+AzHlf4IlQmFxZhHE0DbSZ6icHCEBw/YiFmeZFlgM4YjgWB4W8' +
  'IA==';

/**
 * Eingefrorener Spielstand der Version 4 nach 15 min an der ersten Futterstelle (AP 1.5.2): ein
 * Drüsenpunkt, ein Fund, noch keine DNA und kein Zug. Nicht anpassen: Vorlage für künftige Migrationen.
 */
const FROZEN_V4_SAVE =
  'N4IgbgpgTgzglgewHYgFwBYA0IYQgEzRDnwBsIYB3AQygFsRsokBzAZQBdqOI0BmAAwBGIQPQA2AJwAOPtg5w6vVKCQJKa' +
  'IQHYBu3ZL27spajA5tqkQqm2GBBw9gAOJgJ4E0DvQF9s0akQArrCBTk68TBRooABmCAjWIEIAdOgATHwArBBpjCD4SAGoI' +
  'AIQAiC+IIFIcBww0SAAjoF4SPXFaWV5+FDIUcXiqdlCeTAIpPhw0O0lXZXwPA0cruFEkEgco3AAXsogneijHAgAxgDWRIN' +
  'CEHwV2ABGCIEsABabKk0tEG1E1+XYPT6MzSqQgI2wYwmU1gRFK5UqdGoTgaTgQC0QKA+AA80AJsK5cZUTtQkJN8Nx+gBtU' +
  'DLVbFdabZxo2oYho41AAWhBWkygmkWmkkjS9i0aSF+LQ6GSaUyaXQ0jl0hE8rSQky8x2e0G4i0fCyQj4uq0InEEEOAIgMW' +
  '+uCImWSwzuNJWe2opBYro5iMZIFR6OQbLQHL4ySFeukAky4ky0l5aTFEtQAntwq0xoExskklECq0Gt2RBB9hjkj4aqkcr4' +
  'Zu6lutezhFQAukwnotUNSQLS9gy8r6Wf7sbiEwJvN4myA6AhIO1h/IoJYIKQ0EhAqRSNhqIFjg1vtR7uRrDFXbgIRw5zwW' +
  'ATivdXSSTh55C8oBQXuNrDOfVBEJ/lkRryYkHehDOC80AIBOSD9KAgIQe0WA4K+0LtEI2AsP++BIZULDfGByigOoEHWJSD' +
  'aVDEcCku0oDMOwXCtqWMoytI0jiOI8gIFwi42NgJzjOQJw8NYoBOIEdBwHemiVPcgQxDE7RESOQA';

const NOW = 1_700_000_000_000;

function sampleState(): GameState {
  const initial = createInitialState({ seed: 'idleswarm', now: NOW });
  return {
    ...initial,
    time: { now: NOW + 5000, lastSaved: NOW, played: 5000 },
    res: { food: Num.from('1.284e3'), dna: Num.from(7.5) },
    units: { queens: Num.from(3), drones: Num.from(42), soldiers: Num.ZERO },
    site: { type: 'vent', size: Num.from(20000), stock: Num.from(1234.5) },
    bought: { queens: Num.from(2), drones: Num.from(40), soldiers: Num.ZERO },
    map: {
      ...initial.map,
      position: { x: 1.5, y: -2.25 },
      route: [
        { type: 'vent', position: { x: 0, y: 0 } },
        { type: 'whale-fall', position: { x: 1.5, y: -2.25 } },
      ],
      moves: 1,
    },
    travel: { target: initial.map.candidates[2], remainingMs: 12_345 },
    auto: { enabled: true, strategy: 'battle-hardened', threshold: 0.25 },
    priority: 'soldiers-first',
    pheromones: { drones: 2, soldiers: 3, glands: 1 },
    genome: { owned: ['cilia-1', 'cilia-2', 'acid-vacuole'] },
    finds: {
      rngState: 123_456_789,
      total: 7,
      collected: { 'sulfur-pearl': 2, pumice: 1 },
      buffs: [{ id: 'plankton-bloom', expiresAtMs: 605_000 }],
    },
    settings: { numberFormat: 'engineering', motion: 'reduced', autosaveIntervalMs: 60_000 },
    onboarding: {
      unlocked: ['pheromones', 'map', 'finds', 'genome'],
      seenHints: ['collect', 'map'],
    },
  };
}

function rawSample(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(sampleState()));
}

function encodeRaw(raw: unknown): string {
  return compressToBase64(JSON.stringify(raw));
}

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SaveError);
    return (error as SaveError).code;
  }
  throw new Error('Es wurde ein SaveError erwartet');
}

/** Baut einen rohen Stand, in dem `path` ersetzt oder (bei `undefined`) entfernt ist. */
function withField(path: string, value: unknown): Record<string, unknown> {
  const raw = rawSample();
  const keys = path.split('.');
  const last = keys.pop() as string;
  let target = raw;
  for (const key of keys) {
    target = target[key] as Record<string, unknown>;
  }
  if (value === undefined) {
    delete target[last];
  } else {
    target[last] = value;
  }
  return raw;
}

function expectSameState(actual: GameState, expected: GameState): void {
  expect(JSON.stringify(actual)).toBe(JSON.stringify(expected));
}

describe('encodeSave und decodeSave', () => {
  it('erhält den Zustand beim Hin- und Rückweg', () => {
    const state = sampleState();
    expectSameState(decodeSave(encodeSave(state)), state);
  });

  it('liefert echte Num-Werte', () => {
    const decoded = decodeSave(encodeSave(sampleState()));
    expect(decoded.res.food).toBeInstanceOf(Num);
    expect(decoded.res.food.eq(1284)).toBe(true);
    expect(decoded.units.soldiers.isZero()).toBe(true);
    expect(decoded.site.stock).toBeInstanceOf(Num);
    expect(decoded.site.stock.eq(1234.5)).toBe(true);
    expect(decoded.bought.drones.eq(40)).toBe(true);
  });

  it.each(['1.5e1000000', '9.999999999e8999999999999999', '1.23456789012345e308', '1e-5'])(
    'erhält die Menge %s verlustfrei',
    (text) => {
      const amount = Num.from(text);
      const state = { ...sampleState(), res: { food: amount, dna: Num.ZERO } };
      const decoded = decodeSave(encodeSave(state));
      expect(decoded.res.food.eq(amount)).toBe(true);
      expect(decoded.res.food.toString()).toBe(amount.toString());
    },
  );

  it('erzeugt komprimiertes JSON mit Mengen als String und Versionsfeld', () => {
    const json = JSON.parse(decompressFromBase64(encodeSave(sampleState())));
    expect(json.version).toBe(STATE_VERSION);
    expect(json.res.food).toBe('1.284e3');
    expect(json.site).toEqual({ type: 'vent', size: '2e4', stock: '1.2345e3' });
    expect(json.bought).toEqual({ queens: '2e0', drones: '4e1', soldiers: '0e0' });
    expect(json.map.position).toEqual({ x: 1.5, y: -2.25 });
    expect(json.map.moves).toBe(1);
    expect(json.map.candidates).toHaveLength(6);
    expect(json.map.candidates[0]).toMatchObject({ type: 'algal-mat', defense: '0e0' });
    expect(json.travel).toMatchObject({ remainingMs: 12345, target: { type: 'whale-fall' } });
    expect(json.auto).toEqual({ enabled: true, strategy: 'battle-hardened', threshold: 0.25 });
    expect(json.priority).toBe('soldiers-first');
    expect(json.pheromones).toEqual({ drones: 2, soldiers: 3, glands: 1 });
    expect(json.genome).toEqual({ owned: ['cilia-1', 'cilia-2', 'acid-vacuole'] });
    expect(json.finds).toEqual({
      rngState: 123456789,
      total: 7,
      collected: { 'sulfur-pearl': 2, pumice: 1 },
      buffs: [{ id: 'plankton-bloom', expiresAtMs: 605000 }],
    });
    expect(json.settings).toEqual({
      numberFormat: 'engineering',
      motion: 'reduced',
      autosaveIntervalMs: 60000,
    });
    expect(json.onboarding).toEqual({
      unlocked: ['pheromones', 'map', 'finds', 'genome'],
      seenHints: ['collect', 'map'],
    });
  });

  it('speichert und lädt den Startzustand von Version 5', () => {
    const state = createInitialState({ seed: 'idleswarm', now: NOW });
    expectSameState(decodeSave(encodeSave(state)), state);
  });

  it('liefert echte Num-Werte für Kandidaten und Reiseziel', () => {
    const decoded = decodeSave(encodeSave(sampleState()));
    expect(decoded.map.candidates[1].size).toBeInstanceOf(Num);
    expect(decoded.map.candidates[1].defense.eq(56)).toBe(true);
    expect(decoded.travel?.target.defense.eq(60)).toBe(true);
  });

  it('speichert und lädt einen Stand ohne Reise', () => {
    const state = { ...sampleState(), travel: null };
    expectSameState(decodeSave(encodeSave(state)), state);
  });

  it('verändert den Eingabezustand nicht', () => {
    const state = sampleState();
    const before = JSON.stringify(state);
    Object.freeze(state);
    Object.freeze(state.time);
    Object.freeze(state.res);
    Object.freeze(state.units);
    Object.freeze(state.site);
    Object.freeze(state.bought);
    Object.freeze(state.map);
    Object.freeze(state.auto);
    Object.freeze(state.pheromones);
    Object.freeze(state.genome);
    Object.freeze(state.finds);
    Object.freeze(state.settings);
    Object.freeze(state.onboarding);
    encodeSave(state);
    expect(JSON.stringify(state)).toBe(before);
  });

  it('schreibt keine unbekannten Felder', () => {
    const state = { ...sampleState(), debug: true } as GameState;
    expect(JSON.parse(decompressFromBase64(encodeSave(state)))).not.toHaveProperty('debug');
  });

  it.each<[string, Partial<GameState>]>([
    ['NaN in der Zeit', { time: { now: NaN, lastSaved: 0, played: 0 } }],
    ['negative Menge', { res: { food: Num.from(-1), dna: Num.ZERO } }],
    ['fremde Version', { version: STATE_VERSION + 1 }],
    ['Vorrat über der Größe', { site: { type: 'vent', size: Num.ONE, stock: Num.from(2) } }],
    ['unbekannte Priorität', { priority: 'queens-first' as GameState['priority'] }],
    ['gebrochene Pheromonpunkte', { pheromones: { drones: 1.5, soldiers: 1, glands: 0 } }],
    [
      'unbekanntes Zahlenformat',
      { settings: { ...DEFAULT_SETTINGS, numberFormat: 'roman' as NumberFormat } },
    ],
    [
      'NaN in der Restdauer',
      { travel: { target: sampleState().map.candidates[0], remainingMs: NaN } },
    ],
  ])('schreibt keinen unlesbaren Stand: %s', (_name, patch) => {
    expect(codeOf(() => encodeSave({ ...sampleState(), ...patch }))).toBe('invalid');
  });
});

describe('eingefrorener Spielstand der Version 1', () => {
  it('bleibt ladbar und behält Seed und Zeiten', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.seed).toBe('idleswarm');
    // 1378881061, fortgeschrieben um je 30 Ziehungen der Startkandidaten (Migrationen 2 → 3, 3 → 4).
    expect(state.rngState).toBe(3898647441);
    expect(state.time).toEqual({ now: 1700000360000, lastSaved: 1700000300000, played: 360000 });
    expect(state.era).toBe('ursuppe');
  });

  it('bekommt die Startwerte von Version 5', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expect(JSON.parse(JSON.stringify(state))).toMatchObject({
      res: { food: '1.5e1', dna: '0e0' },
      units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
      site: { type: 'vent', size: '2e4', stock: '2e4' },
      bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
      map: { position: { x: 0, y: 0 }, moves: 0 },
      travel: null,
      auto: { enabled: false, strategy: 'balanced', threshold: 0 },
      priority: 'balanced',
      pheromones: { drones: 3, soldiers: 1, glands: 0 },
      genome: { owned: [] },
      finds: { rngState: 3125258866, total: 0, collected: {}, buffs: [] },
      settings: { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 },
      onboarding: { unlocked: [], seenHints: [] },
    });
    expect(state.map.candidates).toHaveLength(6);
  });

  it('lässt sich nach der Migration wieder speichern und laden', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expectSameState(decodeSave(encodeSave(state)), state);
  });
});

describe('eingefrorener Spielstand der Version 2', () => {
  it('wird migriert: Seed und Zeiten bleiben, alles Übrige beginnt neu', () => {
    const state = decodeSave(FROZEN_V2_SAVE);
    expect(state.version).toBe(STATE_VERSION);
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 5,
      seed: 'idleswarm',
      rngState: 3898647441,
      time: { now: 1700000005000, lastSaved: 1700000000000, played: 5000 },
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
      settings: { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 },
      onboarding: { unlocked: [], seenHints: [] },
    });
  });

  it('bekommt die Startkandidaten aus dem RNG-Zustand nach der Migration 2 → 3', () => {
    // Jede Migration der Kette erzeugt die Kandidaten neu; 3 → 4 beginnt bei 491280603.
    const state = decodeSave(FROZEN_V2_SAVE);
    const fresh = createInitialState({ seed: 'idleswarm', now: NOW, rngState: 491280603 });
    expect(JSON.stringify(state.map.candidates)).toBe(JSON.stringify(fresh.map.candidates));
  });

  it('lässt sich wieder speichern und laden', () => {
    const state = decodeSave(FROZEN_V2_SAVE);
    expectSameState(decodeSave(encodeSave(state)), state);
  });
});

describe('eingefrorener Spielstand der Version 3', () => {
  it('wird migriert: Seed und Zeiten bleiben, alles Übrige beginnt neu', () => {
    const state = decodeSave(FROZEN_V3_SAVE);
    expect(state.version).toBe(STATE_VERSION);
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 5,
      seed: 'idleswarm',
      // 3898647441, fortgeschrieben um die 30 Ziehungen der Startkandidaten (Migration 3 → 4).
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
      settings: { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 },
      onboarding: { unlocked: [], seenHints: [] },
    });
    expect(state.map.candidates).toHaveLength(6);
  });

  it('lässt sich weiterspielen', () => {
    const { state } = step(decodeSave(FROZEN_V3_SAVE), 1000);
    expect(state.time.played).toBe(40_000);
    expect(state.units.drones.gt(0)).toBe(true);
  });

  it('lässt sich wieder speichern und laden', () => {
    const state = decodeSave(FROZEN_V3_SAVE);
    expectSameState(decodeSave(encodeSave(state)), state);
  });
});

describe('eingefrorener Spielstand der Version 4', () => {
  it('wird migriert: der Fortschritt bleibt, Einstellungen und Onboarding kommen dazu', () => {
    const state = decodeSave(FROZEN_V4_SAVE);
    expect(state.version).toBe(STATE_VERSION);
    expect(JSON.parse(JSON.stringify(state))).toEqual({
      version: 5,
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
        candidates: expect.any(Array),
        route: [{ type: 'vent', position: { x: 0, y: 0 } }],
        moves: 0,
      },
      travel: null,
      auto: { enabled: false, strategy: 'balanced', threshold: 0 },
      priority: 'balanced',
      pheromones: { drones: 4, soldiers: 1, glands: 1 },
      genome: { owned: [] },
      finds: { rngState: 3125258866, total: 1, collected: { pumice: 1 }, buffs: [] },
      settings: { numberFormat: 'short', motion: 'system', autosaveIntervalMs: 30000 },
      // Drüse gekauft und ein Fund; Vorrat 30,5 % > 25 %, keine DNA: Umgebung und Genom noch nicht.
      onboarding: {
        unlocked: ['pheromones', 'finds'],
        seenHints: ['collect', 'pheromones', 'finds'],
      },
    });
    expect(state.map.candidates).toHaveLength(2);
  });

  it('lässt sich weiterspielen und schaltet dabei weiter frei', () => {
    const loaded = decodeSave(FROZEN_V4_SAVE);
    const { state } = step(loaded, 1000);
    expect(state.time.played).toBe(901_000);
    expect(state.onboarding.unlocked).toEqual(['pheromones', 'finds']);
    const low = step({ ...loaded, site: { ...loaded.site, stock: Num.from(5000) } }, 1000).state;
    expect(low.onboarding.unlocked).toEqual(['pheromones', 'map', 'finds']);
    expect(low.onboarding.seenHints).toEqual(['collect', 'pheromones', 'finds']);
  });

  it('lässt sich wieder speichern und laden', () => {
    const state = decodeSave(FROZEN_V4_SAVE);
    expectSameState(decodeSave(encodeSave(state)), state);
  });
});

describe('importSave', () => {
  it('liest einen exportierten Text, auch mit Zeilenumbrüchen und Leerzeichen', () => {
    const text = encodeSave(sampleState());
    const pasted = `  ${text.slice(0, 20)}\n${text.slice(20, 50)} \r\n\t${text.slice(50)}\n`;
    const result = importSave(pasted);
    expect(result.ok).toBe(true);
    expectSameState(
      result.ok ? result.state : createInitialState({ seed: '', now: 0 }),
      sampleState(),
    );
  });

  it('migriert ältere Stände', () => {
    const result = importSave(FROZEN_V4_SAVE);
    expect(result.ok && result.state.version).toBe(STATE_VERSION);
  });

  it.each([
    ['', 'corrupt'],
    ['kein Spielstand', 'corrupt'],
    [encodeRaw(withField('version', STATE_VERSION + 1)), 'future-version'],
    [encodeRaw(withField('settings.motion', 'off')), 'invalid'],
  ])('meldet Fehler als Code: %s', (text, code) => {
    const result = importSave(text);
    expect(result.ok).toBe(false);
    expect(result.ok ? null : result.error.code).toBe(code);
  });
});

describe('decodeSave mit beschädigten Eingaben', () => {
  it.each([
    ['leer', ''],
    ['kein Base64', '%%%% kein base64 %%%%'],
    ['falsche Länge', 'abc'],
    ['nichts Dekomprimierbares', '////'],
    ['dekomprimiert zu nichts', 'AAAA'],
    ['abgeschnitten', FROZEN_V1_SAVE.slice(0, 40)],
    ['kein JSON', compressToBase64('kein json')],
    ['leerer komprimierter Text', compressToBase64('')],
  ])('meldet corrupt: %s', (_name, text) => {
    expect(codeOf(() => decodeSave(text))).toBe('corrupt');
  });

  it.each([
    ['null', null],
    ['Array', []],
    ['Zahl', 1],
    ['String', 'x'],
  ])('meldet invalid für JSON ohne Objekt: %s', (_name, raw) => {
    expect(codeOf(() => decodeSave(encodeRaw(raw)))).toBe('invalid');
  });

  it.each<[string, unknown]>([
    ['version', undefined],
    ['version', '1'],
    ['version', 0],
    ['version', 1.5],
    ['seed', undefined],
    ['seed', 42],
    ['rngState', undefined],
    ['rngState', '1'],
    ['rngState', -1],
    ['rngState', 1.5],
    ['rngState', 2 ** 32],
    ['rngState', null],
    ['time', undefined],
    ['time', []],
    ['time.now', undefined],
    ['time.now', '1'],
    ['time.now', -1],
    ['time.now', null],
    ['time.lastSaved', undefined],
    ['time.lastSaved', -1],
    ['time.lastSaved', null],
    ['time.played', undefined],
    ['time.played', -1],
    ['time.played', null],
    ['era', undefined],
    ['era', 'tiefsee'],
    ['res', undefined],
    ['res', null],
    ['res.food', undefined],
    ['res.food', 5],
    ['res.food', null],
    ['res.food', ''],
    ['res.food', 'abc'],
    ['res.food', 'NaN'],
    ['res.food', 'Infinity'],
    ['res.food', '1e9000000000000000'],
    ['res.food', '-1e0'],
    ['res.dna', undefined],
    ['res.dna', '-1'],
    ['units', undefined],
    ['units', 'x'],
    ['units.queens', undefined],
    ['units.queens', '-1e3'],
    ['units.drones', undefined],
    ['units.drones', 1],
    ['units.soldiers', undefined],
    ['units.soldiers', '-5e-1'],
    ['site', undefined],
    ['site', 'vent'],
    ['site.type', undefined],
    ['site.type', 'schlot'],
    ['site.type', 'constructor'],
    ['site.type', 1],
    ['site.size', undefined],
    ['site.size', 20000],
    ['site.size', '-1e0'],
    ['site.stock', undefined],
    ['site.stock', 5],
    ['site.stock', '-1e0'],
    ['site.stock', '2.00001e4'],
    ['bought', undefined],
    ['bought', []],
    ['bought.queens', undefined],
    ['bought.queens', '-1e0'],
    ['bought.drones', undefined],
    ['bought.drones', 1],
    ['bought.soldiers', undefined],
    ['bought.soldiers', 'abc'],
    ['map', undefined],
    ['map', []],
    ['map.position', undefined],
    ['map.position.x', undefined],
    ['map.position.x', '1'],
    ['map.position.y', null],
    ['map.candidates', undefined],
    ['map.candidates', {}],
    ['map.candidates.0', null],
    ['map.candidates.0.type', 'kelp'],
    ['map.candidates.0.type', undefined],
    ['map.candidates.0.position', undefined],
    ['map.candidates.0.position.y', 'x'],
    ['map.candidates.0.size', 17967],
    ['map.candidates.0.size', '-1e0'],
    ['map.candidates.0.defense', undefined],
    ['map.candidates.0.defense', 0],
    ['map.candidates.0.defense', '-1e0'],
    ['map.candidates.0.defense', '2.5e0'],
    ['map.route', undefined],
    ['map.route', []],
    ['map.route', Array.from({ length: 51 }, () => ({ type: 'vent', position: { x: 0, y: 0 } }))],
    ['map.route.0.type', 'schlot'],
    ['map.route.1.position', undefined],
    ['map.moves', undefined],
    ['map.moves', -1],
    ['map.moves', 1.5],
    ['map.moves', '1'],
    ['travel', undefined],
    ['travel', 'vent'],
    ['travel.target', undefined],
    ['travel.target.type', 'kelp'],
    ['travel.target.defense', '1.5e0'],
    ['travel.remainingMs', undefined],
    ['travel.remainingMs', -1],
    ['travel.remainingMs', '1'],
    ['auto', undefined],
    ['auto', null],
    ['auto.enabled', undefined],
    ['auto.enabled', 'true'],
    ['auto.strategy', undefined],
    ['auto.strategy', 'greedy'],
    ['auto.threshold', undefined],
    ['auto.threshold', -0.1],
    ['auto.threshold', 1.5],
    ['auto.threshold', '0'],
    ['priority', undefined],
    ['priority', 'queens-first'],
    ['priority', null],
    ['pheromones', undefined],
    ['pheromones', []],
    ['pheromones.drones', undefined],
    ['pheromones.drones', -1],
    ['pheromones.drones', 1.5],
    ['pheromones.drones', '2'],
    ['pheromones.soldiers', null],
    ['pheromones.soldiers', -1],
    ['pheromones.glands', undefined],
    ['pheromones.glands', 0.5],
    ['genome', undefined],
    ['genome', []],
    ['genome.owned', undefined],
    ['genome.owned', {}],
    ['genome.owned', ['root']],
    ['genome.owned', ['cilia-3']],
    ['genome.owned', [1]],
    ['genome.owned', ['cilia-1', 'cilia-1']],
    ['genome.owned', ['cilia-2']],
    ['genome.owned', ['cilia-1', 'filter-feeder']],
    ['genome.owned', ['thermosynthesis']],
    ['finds', undefined],
    ['finds', null],
    ['finds.rngState', undefined],
    ['finds.rngState', -1],
    ['finds.rngState', 2 ** 32],
    ['finds.rngState', 1.5],
    ['finds.total', undefined],
    ['finds.total', -1],
    ['finds.total', 2.5],
    ['finds.collected', undefined],
    ['finds.collected', []],
    ['finds.collected', { 'foreign-dna': 1 }],
    ['finds.collected', { 'plankton-bloom': 1 }],
    ['finds.collected', { pumice: 0 }],
    ['finds.collected', { pumice: 1.5 }],
    ['finds.collected', { pumice: '1' }],
    ['finds.collected', { constructor: 1 }],
    ['settings', undefined],
    ['settings', null],
    ['settings.numberFormat', undefined],
    ['settings.numberFormat', 'Short'],
    ['settings.motion', 'off'],
    ['settings.motion', true],
    ['settings.autosaveIntervalMs', 15000],
    ['settings.autosaveIntervalMs', '30000'],
    ['onboarding', undefined],
    ['onboarding', []],
    ['onboarding.unlocked', undefined],
    ['onboarding.unlocked', {}],
    ['onboarding.unlocked', ['sonar']],
    ['onboarding.unlocked', ['map', 'map']],
    ['onboarding.seenHints', undefined],
    ['onboarding.seenHints', ['collect', 'collect']],
    ['onboarding.seenHints', ['welcome']],
    ['onboarding.seenHints', [1]],
    ['finds.buffs', undefined],
    ['finds.buffs', {}],
    ['finds.buffs', [null]],
    ['finds.buffs', [{ id: 'warm-current' }]],
    ['finds.buffs', [{ id: 'sulfur-pearl', expiresAtMs: 1 }]],
    ['finds.buffs', [{ id: 'warm-current', expiresAtMs: -1 }]],
    ['finds.buffs', [{ id: 'warm-current', expiresAtMs: '1' }]],
    [
      'finds.buffs',
      [
        { id: 'warm-current', expiresAtMs: 1 },
        { id: 'warm-current', expiresAtMs: 2 },
      ],
    ],
  ])('meldet invalid für %s = %j', (path, value) => {
    expect(codeOf(() => decodeSave(encodeRaw(withField(path, value))))).toBe('invalid');
  });

  it('lehnt ein unendliches time.now aus dem JSON-Text ab', () => {
    const json = JSON.stringify(rawSample()).replace(`"now":${NOW + 5000}`, '"now":1e999');
    expect(codeOf(() => decodeSave(compressToBase64(json)))).toBe('invalid');
  });

  it('akzeptiert die Grenzwerte', () => {
    const raw = withField('rngState', 2 ** 32 - 1);
    raw['time'] = { now: 0, lastSaved: 0, played: 0 };
    raw['seed'] = '';
    const state = decodeSave(encodeRaw(raw));
    expect(state.rngState).toBe(2 ** 32 - 1);
    expect(state.time.now).toBe(0);
    expect(state.seed).toBe('');
  });

  it.each(['0e0', '2e4'])('akzeptiert den Vorrat %s innerhalb der Größe', (stock) => {
    const state = decodeSave(encodeRaw(withField('site.stock', stock)));
    expect(state.site.stock.toString()).toBe(stock);
  });

  it('akzeptiert eine Route mit genau 50 Punkten', () => {
    const route = Array.from({ length: 50 }, (_item, i) => ({
      type: 'vent',
      position: { x: i, y: 0 },
    }));
    expect(decodeSave(encodeRaw(withField('map.route', route))).map.route).toHaveLength(50);
  });

  it('akzeptiert eine leere Kandidatenliste und die Grenzen der Schwelle', () => {
    expect(decodeSave(encodeRaw(withField('map.candidates', []))).map.candidates).toEqual([]);
    expect(decodeSave(encodeRaw(withField('auto.threshold', 0))).auto.threshold).toBe(0);
    expect(decodeSave(encodeRaw(withField('auto.threshold', 1))).auto.threshold).toBe(1);
    expect(decodeSave(encodeRaw(withField('travel.remainingMs', 0))).travel?.remainingMs).toBe(0);
  });

  it('akzeptiert die Grenzen von Pheromonen, Genom und Funden', () => {
    // `P_v ≤ P_ges` und die benötigte Fragmentzahl sind Balance-Werte und werden nicht geprüft.
    const pheromones = { drones: 40, soldiers: 0, glands: 0 };
    expect(decodeSave(encodeRaw(withField('pheromones', pheromones))).pheromones).toEqual(
      pheromones,
    );
    const owned = ['yolk-reserve', 'cilia-2', 'cilia-1'];
    expect(decodeSave(encodeRaw(withField('genome.owned', owned))).genome.owned).toEqual(owned);
    expect(decodeSave(encodeRaw(withField('genome.owned', []))).genome.owned).toEqual([]);
    const collected = { 'sulfur-pearl': 99, stromatolite: 1 };
    expect(decodeSave(encodeRaw(withField('finds.collected', collected))).finds.collected).toEqual(
      collected,
    );
    const buffs = [
      { id: 'warm-current', expiresAtMs: 0 },
      { id: 'plankton-bloom', expiresAtMs: 10 },
    ];
    expect(decodeSave(encodeRaw(withField('finds.buffs', buffs))).finds.buffs).toEqual(buffs);
    expect(decodeSave(encodeRaw(withField('finds.rngState', 0))).finds.rngState).toBe(0);
    expect(decodeSave(encodeRaw(withField('finds.total', 0))).finds.total).toBe(0);
  });

  it('akzeptiert Onboarding-Listen in beliebiger Reihenfolge und ordnet sie', () => {
    const unlocked = ['genome', 'pheromones'];
    const seenHints = ['auto-move', 'collect'];
    const state = decodeSave(encodeRaw(withField('onboarding', { unlocked, seenHints })));
    expect(state.onboarding).toEqual({
      unlocked: ['pheromones', 'genome'],
      seenHints: ['collect', 'auto-move'],
    });
    // Ob Freischaltungen zum Fortschritt passen, prüft das Laden nicht (ohne Balance-Werte).
    const empty = decodeSave(encodeRaw(withField('onboarding', { unlocked: [], seenHints: [] })));
    expect(empty.onboarding).toEqual({ unlocked: [], seenHints: [] });
  });

  it.each([10_000, 30_000, 60_000, 300_000])('akzeptiert das Autosave-Intervall %d ms', (ms) => {
    const raw = withField('settings.autosaveIntervalMs', ms);
    expect(decodeSave(encodeRaw(raw)).settings.autosaveIntervalMs).toBe(ms);
  });

  it('lässt keine Fundzähler über __proto__ einschleusen', () => {
    const json = JSON.stringify(rawSample()).replace(
      '"collected":{',
      '"collected":{"__proto__":{"pumice":1},',
    );
    expect(codeOf(() => decodeSave(compressToBase64(json)))).toBe('invalid');
  });

  it('meldet future-version für neuere Stände', () => {
    expect(codeOf(() => decodeSave(encodeRaw(withField('version', STATE_VERSION + 1))))).toBe(
      'future-version',
    );
  });

  it('übernimmt nur bekannte Felder', () => {
    const raw = rawSample();
    raw['extra'] = 1;
    (raw['time'] as Record<string, unknown>)['extra'] = 1;
    (raw['res'] as Record<string, unknown>)['extra'] = '1e0';
    (raw['units'] as Record<string, unknown>)['extra'] = '1e0';
    (raw['site'] as Record<string, unknown>)['extra'] = '1e0';
    (raw['bought'] as Record<string, unknown>)['extra'] = '1e0';
    const map = raw['map'] as Record<string, unknown>;
    map['extra'] = 1;
    (map['candidates'] as Record<string, unknown>[])[0]['extra'] = 1;
    (map['route'] as Record<string, unknown>[])[0]['extra'] = 1;
    (raw['travel'] as Record<string, unknown>)['extra'] = 1;
    (raw['auto'] as Record<string, unknown>)['extra'] = 1;
    (raw['pheromones'] as Record<string, unknown>)['extra'] = 1;
    (raw['genome'] as Record<string, unknown>)['extra'] = 1;
    const finds = raw['finds'] as Record<string, unknown>;
    finds['extra'] = 1;
    (finds['buffs'] as Record<string, unknown>[])[0]['extra'] = 1;
    (raw['settings'] as Record<string, unknown>)['extra'] = 1;
    (raw['onboarding'] as Record<string, unknown>)['extra'] = 1;
    expectSameState(decodeSave(encodeRaw(raw)), sampleState());
  });

  it('lässt fehlende Felder nicht über __proto__ einschleusen', () => {
    const raw = rawSample();
    const seed = raw['seed'];
    delete raw['seed'];
    const json = JSON.stringify(raw).replace('{', `{"__proto__":{"seed":"${seed}"},`);
    expect(codeOf(() => decodeSave(compressToBase64(json)))).toBe('invalid');
  });

  it('hängt die Ursache eines ungültigen Num-Strings an', () => {
    let error: unknown;
    try {
      decodeSave(encodeRaw(withField('res.food', 'abc')));
    } catch (caught) {
      error = caught;
    }
    expect((error as SaveError).cause).toBeInstanceOf(RangeError);
    expect((error as SaveError).name).toBe('SaveError');
  });
});
