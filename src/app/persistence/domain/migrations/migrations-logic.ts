import { STATE_VERSION } from '@app/engine/domain/models/game-state.model';

import { migrateV1ToV2 } from './v1-to-v2';
import { migrateV2ToV3 } from './v2-to-v3';
import { migrateV3ToV4 } from './v3-to-v4';

/**
 * Fehlerarten beim Lesen und Schreiben von Spielständen. `storage` steht für einen Fehler des
 * Speichers selbst (Quota, blockierter Zugriff); die Ursache liegt dann in `cause`.
 */
export type SaveErrorCode =
  'corrupt' | 'invalid' | 'future-version' | 'missing-migration' | 'storage';

/** Liegt hier statt in `serialize.ts`, damit kein Import-Zyklus entsteht. */
export class SaveError extends Error {
  override readonly name = 'SaveError';

  constructor(
    readonly code: SaveErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

/** Rohes, aus JSON gelesenes Spielstand-Objekt. */
export type RawSave = Readonly<Record<string, unknown>>;

/** Hebt einen rohen Spielstand um genau eine Version an. */
export type Migration = (raw: RawSave) => RawSave;

/** Schlüssel ist die Ausgangsversion `n`, der Eintrag migriert von `n` nach `n + 1`. */
export type MigrationRegistry = Readonly<Partial<Record<number, Migration>>>;

export interface MigrateOptions {
  readonly migrations?: MigrationRegistry;
  readonly target?: number;
}

export const MIGRATIONS: MigrationRegistry = {
  1: migrateV1ToV2,
  2: migrateV2ToV3,
  3: migrateV3ToV4,
};

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function applyStep(step: Migration, raw: RawSave, from: number): RawSave {
  let next: unknown;
  try {
    next = step(raw);
  } catch (cause) {
    throw new SaveError('invalid', `Migration von Version ${from} fehlgeschlagen`, { cause });
  }
  if (!isRecord(next)) {
    throw new SaveError('invalid', `Migration von Version ${from} liefert kein Objekt`);
  }
  // Eine Migration darf die Version offen lassen, aber keine andere Zielversion melden.
  const reported = next['version'];
  if (reported !== undefined && reported !== from && reported !== from + 1) {
    throw new SaveError('invalid', `Migration von Version ${from} meldet Version ${reported}`);
  }
  return { ...next, version: from + 1 };
}

/**
 * Hebt einen rohen Spielstand schrittweise auf `target`. Die Eingabe bleibt unverändert, auch wenn
 * eine Migration ihr Argument verändert: Die Kette arbeitet auf einer tiefen Kopie.
 */
export function migrate(
  raw: unknown,
  { migrations = MIGRATIONS, target = STATE_VERSION }: MigrateOptions = {},
): RawSave {
  if (!isRecord(raw)) {
    throw new SaveError('invalid', 'Spielstand ist kein Objekt');
  }
  const version = raw['version'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('invalid', 'Ungültige Spielstand-Version');
  }
  if (version > target) {
    throw new SaveError('future-version', `Version ${version} ist neuer als ${target}`);
  }
  let current = JSON.parse(JSON.stringify(raw)) as RawSave;
  for (let from = version; from < target; from++) {
    const step = migrations[from];
    if (!step) {
      throw new SaveError('missing-migration', `Keine Migration von Version ${from}`);
    }
    current = applyStep(step, current, from);
  }
  return current;
}
