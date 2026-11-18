import { STATE_VERSION } from '@app/engine/domain/models/game-state.model';

import { Migration, MigrationRegistry, migrate, RawSave, SaveError } from './migrations-logic';

function codeOf(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    expect(error).toBeInstanceOf(SaveError);
    return (error as SaveError).code;
  }
  throw new Error('Es wurde ein SaveError erwartet');
}

/** Nur für diese Tests: v1 benennt `a` in `b` um, v2 ergänzt `c`. */
const TEST_MIGRATIONS: MigrationRegistry = {
  1: ({ a, ...rest }) => ({ ...rest, b: a }),
  2: (raw) => ({ ...raw, version: 3, c: 'neu' }),
};

describe('migrate', () => {
  it('lässt einen aktuellen Stand inhaltlich unverändert und liefert eine Kopie', () => {
    const raw = { version: STATE_VERSION, nested: { value: 1 } };
    const result = migrate(raw);
    expect(result).toEqual(raw);
    expect(result).not.toBe(raw);
    expect(result['nested']).not.toBe(raw.nested);
  });

  it('wendet die Kette der Reihe nach an und setzt die Version', () => {
    expect(migrate({ version: 1, a: 7 }, { migrations: TEST_MIGRATIONS, target: 3 })).toEqual({
      version: 3,
      b: 7,
      c: 'neu',
    });
  });

  it('beginnt bei der Version des Stands', () => {
    const first = vi.fn<Migration>((raw) => raw);
    const second = vi.fn<Migration>((raw) => raw);
    migrate({ version: 2 }, { migrations: { 1: first, 2: second }, target: 3 });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('übergibt jedem Schritt die Version seines Ausgangsstands', () => {
    const seen: unknown[] = [];
    const record: Migration = (raw) => {
      seen.push(raw['version']);
      return raw;
    };
    const result = migrate({ version: 1 }, { migrations: { 1: record, 2: record }, target: 3 });
    expect(seen).toEqual([1, 2]);
    expect(result['version']).toBe(3);
  });

  it('setzt die Version, wenn eine Migration sie weglässt', () => {
    const rebuild: Migration = () => ({ rebuilt: true });
    expect(migrate({ version: 1 }, { migrations: { 1: rebuild }, target: 2 })).toEqual({
      version: 2,
      rebuilt: true,
    });
  });

  it('verändert die Eingabe nicht, auch wenn eine Migration ihr Argument verändert', () => {
    const mutating: Migration = (raw) => {
      (raw['nested'] as { value: number }).value = 99;
      (raw as Record<string, unknown>)['added'] = true;
      return raw;
    };
    const raw = Object.freeze({ version: 1, nested: Object.freeze({ value: 1 }) });
    const result = migrate(raw, { migrations: { 1: mutating }, target: 2 });
    expect(raw).toEqual({ version: 1, nested: { value: 1 } });
    expect(result).toEqual({ version: 2, nested: { value: 99 }, added: true });
  });

  it.each([
    ['fehlend', {}],
    ['String', { version: '1' }],
    ['null', { version: null }],
    ['Bruch', { version: 1.5 }],
    ['null als Zahl', { version: 0 }],
    ['negativ', { version: -1 }],
  ])('lehnt die Version ab: %s', (_name, raw) => {
    expect(codeOf(() => migrate(raw))).toBe('invalid');
  });

  it.each([
    ['null', null],
    ['Array', [{ version: 1 }]],
    ['Zahl', 1],
    ['String', 'x'],
  ])('lehnt Nicht-Objekte ab: %s', (_name, raw) => {
    expect(codeOf(() => migrate(raw))).toBe('invalid');
  });

  it('meldet zu neue Stände', () => {
    expect(codeOf(() => migrate({ version: STATE_VERSION + 1 }))).toBe('future-version');
    expect(codeOf(() => migrate({ version: 4 }, { target: 3 }))).toBe('future-version');
  });

  it('meldet Lücken in der Kette', () => {
    const migrations: MigrationRegistry = { 1: (raw) => raw };
    expect(codeOf(() => migrate({ version: 1 }, { migrations, target: 3 }))).toBe(
      'missing-migration',
    );
    expect(codeOf(() => migrate({ version: 1 }, { migrations: {}, target: 2 }))).toBe(
      'missing-migration',
    );
  });

  it('meldet eine falsche Zielversion einer Migration', () => {
    const migrations: MigrationRegistry = { 1: (raw) => ({ ...raw, version: 5 }) };
    expect(codeOf(() => migrate({ version: 1 }, { migrations, target: 2 }))).toBe('invalid');
  });

  it('meldet eine Migration, die kein Objekt liefert', () => {
    const migrations: MigrationRegistry = { 1: () => null as unknown as RawSave };
    expect(codeOf(() => migrate({ version: 1 }, { migrations, target: 2 }))).toBe('invalid');
  });

  it('wandelt Ausnahmen einer Migration in einen SaveError mit Ursache um', () => {
    const cause = new TypeError('kaputt');
    const migrations: MigrationRegistry = {
      1: () => {
        throw cause;
      },
    };
    let error: unknown;
    try {
      migrate({ version: 1 }, { migrations, target: 2 });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(SaveError);
    expect((error as SaveError).code).toBe('invalid');
    expect((error as SaveError).cause).toBe(cause);
  });
});
