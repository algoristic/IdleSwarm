import { AUTOSAVE_INTERVALS_MS, DEFAULT_SETTINGS, Settings } from './models/settings.model';
import { isValidSettingsPatch, parseAutosaveIntervalMs, updateSettings } from './settings-logic';

describe('Einstellungen (US-09.01)', () => {
  it('bietet 10 s, 30 s, 60 s und 5 min als Autosave-Intervall, Standard 30 s', () => {
    expect(AUTOSAVE_INTERVALS_MS).toEqual([10_000, 30_000, 60_000, 300_000]);
    expect(DEFAULT_SETTINGS).toEqual({
      numberFormat: 'short',
      motion: 'system',
      autosaveIntervalMs: 30_000,
    });
    expect(Object.isFrozen(DEFAULT_SETTINGS)).toBe(true);
  });

  it('übernimmt nur die angegebenen Felder', () => {
    expect(updateSettings(DEFAULT_SETTINGS, { numberFormat: 'engineering' })).toEqual({
      ...DEFAULT_SETTINGS,
      numberFormat: 'engineering',
    });
    expect(
      updateSettings(DEFAULT_SETTINGS, { motion: 'full', autosaveIntervalMs: 10_000 }),
    ).toEqual({ numberFormat: 'short', motion: 'full', autosaveIntervalMs: 10_000 });
  });

  it('gibt ohne Änderung dasselbe Objekt zurück', () => {
    expect(updateSettings(DEFAULT_SETTINGS, {})).toBe(DEFAULT_SETTINGS);
    expect(updateSettings(DEFAULT_SETTINGS, { motion: 'system' })).toBe(DEFAULT_SETTINGS);
  });

  it.each<[string, Partial<Record<keyof Settings, unknown>>]>([
    ['Zahlenformat', { numberFormat: 'roman' }],
    ['Animationen', { motion: 'off' }],
    ['Intervall', { autosaveIntervalMs: 15_000 }],
    ['Intervall als Text', { autosaveIntervalMs: '30000' }],
    ['ein gültiges und ein ungültiges Feld', { numberFormat: 'scientific', motion: 1 }],
  ])('weist Werte außerhalb der Listen ab: %s', (_name, patch) => {
    const unchecked = patch as Partial<Settings>;
    expect(isValidSettingsPatch(unchecked)).toBe(false);
    expect(updateSettings(DEFAULT_SETTINGS, unchecked)).toBe(DEFAULT_SETTINGS);
  });

  it('liest Autosave-Intervalle aus Formularwerten', () => {
    expect(parseAutosaveIntervalMs('10000')).toBe(10_000);
    expect(parseAutosaveIntervalMs('300000')).toBe(300_000);
    expect(parseAutosaveIntervalMs('20000')).toBeNull();
    expect(parseAutosaveIntervalMs('')).toBeNull();
    expect(parseAutosaveIntervalMs('1e4')).toBeNull();
    expect(parseAutosaveIntervalMs(' 10000')).toBeNull();
  });
});
