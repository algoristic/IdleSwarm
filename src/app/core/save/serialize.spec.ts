import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { Num } from '../num/num';
import { createInitialState, GameState, STATE_VERSION } from '../state/game-state';
import { decodeSave, encodeSave, SaveError } from './serialize';

/**
 * Eingefrorener Spielstand der Version 1 (technisches Konzept §10). Nicht anpassen: Er muss auch
 * nach künftigen Formatänderungen ladbar bleiben.
 */
const FROZEN_V1_SAVE =
  'N4IgbgpgTgzglgewHYgFwEYA0IYQgEzRDnwBsIYB3AQygFsRsokBzAZQBdqOI10BmAOwAOUegAMANiwgOcOr1SgkCSn0HjNm/pK3jspajA5tqkQhg17+e/SAAOhgJ4E0OvQF9s0akQCusH729rxMFGigAGYICBYg6AB0AEzCACwQ/Iwg+Ei+qCCCCQCsEOIgXiB+SHAcMBEgAI5+eEh1+fylWfhQyOH5qckQ6FkwCKT4cNBt8cVDtmUeHkA=';

const NOW = 1_700_000_000_000;

function sampleState(): GameState {
  return {
    ...createInitialState({ seed: 'idleswarm', now: NOW }),
    time: { now: NOW + 5000, lastSaved: NOW, played: 5000 },
    res: { food: Num.from('1.284e3'), dna: Num.from(7.5) },
    units: { queens: Num.from(3), drones: Num.from(42), soldiers: Num.ZERO },
    site: { type: 'vent', size: Num.from(20000), stock: Num.from(1234.5) },
    bought: { queens: Num.from(2), drones: Num.from(40), soldiers: Num.ZERO },
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
  ])('schreibt keinen unlesbaren Stand: %s', (_name, patch) => {
    expect(codeOf(() => encodeSave({ ...sampleState(), ...patch }))).toBe('invalid');
  });
});

describe('eingefrorener Spielstand der Version 1', () => {
  it('bleibt ladbar und behält Seed, RNG-Zustand und Zeiten', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expect(state.version).toBe(STATE_VERSION);
    expect(state.seed).toBe('idleswarm');
    expect(state.rngState).toBe(1378881061);
    expect(state.time).toEqual({ now: 1700000360000, lastSaved: 1700000300000, played: 360000 });
    expect(state.era).toBe('ursuppe');
  });

  it('bekommt die Startwerte von Version 2', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expect(JSON.parse(JSON.stringify(state))).toMatchObject({
      res: { food: '1.5e1', dna: '0e0' },
      units: { queens: '1e0', drones: '0e0', soldiers: '0e0' },
      site: { type: 'vent', size: '2e4', stock: '2e4' },
      bought: { queens: '0e0', drones: '0e0', soldiers: '0e0' },
    });
  });

  it('lässt sich nach der Migration wieder speichern und laden', () => {
    const state = decodeSave(FROZEN_V1_SAVE);
    expectSameState(decodeSave(encodeSave(state)), state);
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
