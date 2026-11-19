import { compressToBase64, decompressFromBase64 } from 'lz-string';

import { GameState, STATE_VERSION } from '@app/engine/domain/models/game-state.model';
import {
  BuffId,
  CollectedId,
  FindBuff,
  Finds,
  isBuffId,
  isCollectedId,
} from '@app/finds/domain/models/finds.model';
import { GENOME_NODE_PREDECESSORS } from '@app/genome/domain/data/genome-era1.data';
import {
  Genome,
  GENOME_ROOT,
  GenomeNodeId,
  isGenomeNodeId,
} from '@app/genome/domain/models/genome.model';
import { Num } from '@app/shared/util/num/num';
import { isSiteTypeId, SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import { AutoMove, isStrategyId } from '@app/site/domain/models/auto-move.model';
import {
  Position,
  ROUTE_MAX_POINTS,
  RoutePoint,
  SiteCandidate,
  SiteMap,
} from '@app/site/domain/models/map.model';
import { Site } from '@app/site/domain/models/site.model';
import { Travel } from '@app/site/domain/models/travel.model';
import { Pheromones } from '@app/swarm/domain/models/pheromones.model';
import {
  isTransportPriority,
  TransportPriority,
} from '@app/swarm/domain/models/transport-priority.model';
import { Units } from '@app/swarm/domain/models/units.model';

import { isRecord, migrate, SaveError } from './migrations/migrations-logic';

export { SaveError } from './migrations/migrations-logic';
export type { SaveErrorCode } from './migrations/migrations-logic';

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

function readRngState(value: unknown, path = 'rngState'): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw invalid(path);
  }
  if (value < 0 || value >= UINT32_LIMIT) {
    throw invalid(path);
  }
  return value;
}

/** Ganze Zahl ab `min`, z. B. Pheromonpunkte oder Fundzähler. */
function readCount(value: unknown, path: string, min = 0): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
    throw invalid(path);
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

function readSiteType(value: unknown, path: string): SiteTypeId {
  if (!isSiteTypeId(value)) {
    throw invalid(path);
  }
  return value;
}

function readCoordinate(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw invalid(path);
  }
  return value;
}

function readPosition(value: unknown, path: string): Position {
  const position = readRecord(value, path);
  return {
    x: readCoordinate(position['x'], `${path}.x`),
    y: readCoordinate(position['y'], `${path}.y`),
  };
}

function readArray(value: unknown, path: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw invalid(path);
  }
  return value;
}

function readCandidate(value: unknown, path: string): SiteCandidate {
  const candidate = readRecord(value, path);
  const defense = readAmount(candidate['defense'], `${path}.defense`);
  // Die Abwehr ist immer ganzzahlig (Game-Design §4.6).
  if (!defense.round().eq(defense)) {
    throw invalid(`${path}.defense`);
  }
  return {
    type: readSiteType(candidate['type'], `${path}.type`),
    position: readPosition(candidate['position'], `${path}.position`),
    size: readAmount(candidate['size'], `${path}.size`),
    defense,
  };
}

function readRoutePoint(value: unknown, path: string): RoutePoint {
  const point = readRecord(value, path);
  return {
    type: readSiteType(point['type'], `${path}.type`),
    position: readPosition(point['position'], `${path}.position`),
  };
}

function readMap(value: unknown): SiteMap {
  const map = readRecord(value, 'map');
  const candidates = readArray(map['candidates'], 'map.candidates');
  const route = readArray(map['route'], 'map.route');
  if (route.length === 0 || route.length > ROUTE_MAX_POINTS) {
    throw invalid('map.route');
  }
  const moves = map['moves'];
  if (typeof moves !== 'number' || !Number.isInteger(moves) || moves < 0) {
    throw invalid('map.moves');
  }
  return {
    position: readPosition(map['position'], 'map.position'),
    candidates: candidates.map((item, i) => readCandidate(item, `map.candidates.${i}`)),
    route: route.map((item, i) => readRoutePoint(item, `map.route.${i}`)),
    moves,
  };
}

function readTravel(value: unknown): Travel | null {
  if (value === null) {
    return null;
  }
  const travel = readRecord(value, 'travel');
  return {
    target: readCandidate(travel['target'], 'travel.target'),
    remainingMs: readTime(travel['remainingMs'], 'travel.remainingMs'),
  };
}

/** Die Schwelle ist ein Anteil; die Obergrenze `θ_max` ist ein Balance-Wert und wird nicht geprüft. */
function readAuto(value: unknown): AutoMove {
  const auto = readRecord(value, 'auto');
  const { enabled, strategy, threshold } = auto;
  if (typeof enabled !== 'boolean') {
    throw invalid('auto.enabled');
  }
  if (!isStrategyId(strategy)) {
    throw invalid('auto.strategy');
  }
  if (typeof threshold !== 'number' || !(threshold >= 0 && threshold <= 1)) {
    throw invalid('auto.threshold');
  }
  return { enabled, strategy, threshold };
}

function readPriority(value: unknown): TransportPriority {
  if (!isTransportPriority(value)) {
    throw invalid('priority');
  }
  return value;
}

/**
 * Ob `P_v ≤ P_ges` gilt, prüft das Laden nicht: `P_ges` hängt von Balance-Werten ab, wirksam sind
 * höchstens `P_ges` Punkte (Game-Design §4.15, §5.1).
 */
function readPheromones(value: unknown): Pheromones {
  const pheromones = readRecord(value, 'pheromones');
  return {
    drones: readCount(pheromones['drones'], 'pheromones.drones'),
    soldiers: readCount(pheromones['soldiers'], 'pheromones.soldiers'),
    glands: readCount(pheromones['glands'], 'pheromones.glands'),
  };
}

/** Bekannte reguläre Knoten, keiner doppelt, zu jedem sein Vorgänger (Datenregel, Game-Design §5.1). */
function readGenome(value: unknown): Genome {
  const genome = readRecord(value, 'genome');
  const items = readArray(genome['owned'], 'genome.owned');
  const owned: GenomeNodeId[] = items.map((id, i) => {
    if (!isGenomeNodeId(id)) {
      throw invalid(`genome.owned.${i}`);
    }
    return id;
  });
  const known = new Set<string>([GENOME_ROOT]);
  for (const id of owned) {
    if (known.has(id)) {
      throw invalid('genome.owned');
    }
    known.add(id);
  }
  for (const id of owned) {
    if (!known.has(GENOME_NODE_PREDECESSORS[id])) {
      throw invalid('genome.owned');
    }
  }
  return { owned };
}

/** Zähler über der benötigten Fragmentzahl bleiben erhalten; die Grenze ist ein Balance-Wert. */
function readCollected(value: unknown): Partial<Record<CollectedId, number>> {
  const raw = readRecord(value, 'finds.collected');
  const collected: Partial<Record<CollectedId, number>> = {};
  for (const [id, count] of Object.entries(raw)) {
    if (!isCollectedId(id)) {
      throw invalid(`finds.collected.${id}`);
    }
    collected[id] = readCount(count, `finds.collected.${id}`, 1);
  }
  return collected;
}

/** Abgelaufene Buffs sind zulässig; der nächste Schritt entfernt sie (Game-Design §5.1). */
function readBuffs(value: unknown): FindBuff[] {
  const items = readArray(value, 'finds.buffs');
  const seen = new Set<BuffId>();
  return items.map((item, i) => {
    const buff = readRecord(item, `finds.buffs.${i}`);
    const id = buff['id'];
    if (!isBuffId(id) || seen.has(id)) {
      throw invalid(`finds.buffs.${i}.id`);
    }
    seen.add(id);
    return { id, expiresAtMs: readTime(buff['expiresAtMs'], `finds.buffs.${i}.expiresAtMs`) };
  });
}

function readFinds(value: unknown): Finds {
  const finds = readRecord(value, 'finds');
  return {
    rngState: readRngState(finds['rngState'], 'finds.rngState'),
    total: readCount(finds['total'], 'finds.total'),
    collected: readCollected(finds['collected']),
    buffs: readBuffs(finds['buffs']),
  };
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
    map: readMap(raw['map']),
    travel: readTravel(raw['travel']),
    auto: readAuto(raw['auto']),
    priority: readPriority(raw['priority']),
    pheromones: readPheromones(raw['pheromones']),
    genome: readGenome(raw['genome']),
    finds: readFinds(raw['finds']),
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
