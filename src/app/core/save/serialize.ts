import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { isSiteTypeId } from '../data/sites-era1';
import { Num } from '../num/num';
import { GameState, Site, STATE_VERSION, Units } from '../state/game-state';
import { isRecord, migrate, SaveError } from './migrations/index';

export { SaveError } from './migrations/index';
export type { SaveErrorCode } from './migrations/index';

/** `lz-string` füllt auf Vielfache von vier auf und nutzt dafür bis zu drei `=`. */
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,3}$/;

const UINT32_LIMIT = 2 ** 32;

function invalid(path: string): SaveError {
  return new SaveError('invalid', `Ungültiges Feld: ${path}`);
}

function readRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw invalid(path);
  }
  return value;
}

function readTime(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw invalid(path);
  }
  return value;
}

function readRngState(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw invalid('rngState');
  }
  if (value < 0 || value >= UINT32_LIMIT) {
    throw invalid('rngState');
  }
  return value;
}

/** Nur Strings: `Num.from` nähme auch Zahlen an, das Format sieht aber Strings vor. */
function readAmount(value: unknown, path: string): Num {
  if (typeof value !== 'string') {
    throw invalid(path);
  }
  let amount: Num;
  try {
    amount = Num.from(value);
  } catch (cause) {
    throw new SaveError('invalid', `Ungültiges Feld: ${path}`, { cause });
  }
  if (amount.isNegative()) {
    throw invalid(path);
  }
  return amount;
}

function readUnits(value: unknown, path: string): Units {
  const units = readRecord(value, path);
  return {
    queens: readAmount(units['queens'], `${path}.queens`),
    drones: readAmount(units['drones'], `${path}.drones`),
    soldiers: readAmount(units['soldiers'], `${path}.soldiers`),
  };
}

function readSite(value: unknown): Site {
  const site = readRecord(value, 'site');
  const type = site['type'];
  if (!isSiteTypeId(type)) {
    throw invalid('site.type');
  }
  const size = readAmount(site['size'], 'site.size');
  const stock = readAmount(site['stock'], 'site.stock');
  if (stock.gt(size)) {
    throw invalid('site.stock');
  }
  return { type, size, stock };
}

/** Prüft einen rohen Stand der aktuellen Version und übernimmt nur die bekannten Felder. */
function toGameState(value: unknown): GameState {
  const raw = readRecord(value, 'Spielstand');
  if (raw['version'] !== STATE_VERSION) {
    throw invalid('version');
  }
  const seed = raw['seed'];
  if (typeof seed !== 'string') {
    throw invalid('seed');
  }
  if (raw['era'] !== 'ursuppe') {
    throw invalid('era');
  }
  const time = readRecord(raw['time'], 'time');
  const res = readRecord(raw['res'], 'res');
  return {
    version: STATE_VERSION,
    seed,
    rngState: readRngState(raw['rngState']),
    time: {
      now: readTime(time['now'], 'time.now'),
      lastSaved: readTime(time['lastSaved'], 'time.lastSaved'),
      played: readTime(time['played'], 'time.played'),
    },
    era: 'ursuppe',
    res: {
      food: readAmount(res['food'], 'res.food'),
      dna: readAmount(res['dna'], 'res.dna'),
    },
    units: readUnits(raw['units'], 'units'),
    site: readSite(raw['site']),
    bought: readUnits(raw['bought'], 'bought'),
  };
}

function parseSave(text: string): unknown {
  if (text.length % 4 !== 0 || !BASE64_PATTERN.test(text)) {
    throw new SaveError('corrupt', 'Spielstand ist kein gültiges Base64');
  }
  let json: string | null;
  try {
    // Entgegen der Typdefinition liefert `lz-string` bei Müll auch `null`.
    json = decompressFromBase64(text);
  } catch (cause) {
    throw new SaveError('corrupt', 'Spielstand lässt sich nicht entpacken', { cause });
  }
  if (!json) {
    throw new SaveError('corrupt', 'Spielstand lässt sich nicht entpacken');
  }
  try {
    return JSON.parse(json);
  } catch (cause) {
    throw new SaveError('corrupt', 'Spielstand ist kein gültiges JSON', { cause });
  }
}

/**
 * Erzeugt den Speichertext. Wirft `SaveError('invalid')` für einen Zustand, den {@link decodeSave}
 * ablehnen würde (etwa `NaN` in einer Zeitangabe), damit nie ein unlesbarer Stand entsteht.
 */
export function encodeSave(state: GameState): string {
  const checked = toGameState(JSON.parse(JSON.stringify(state)));
  return compressToBase64(JSON.stringify(checked));
}

/** Liest, migriert und prüft einen Speichertext; Fehler sind immer {@link SaveError}. */
export function decodeSave(text: string): GameState {
  return toGameState(migrate(parseSave(text)));
}
