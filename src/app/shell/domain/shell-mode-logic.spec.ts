import { neighborMode, SHELL_MODE_PATHS, shellModeFromPath } from './shell-mode-logic';

describe('shellModeFromPath', () => {
  it('ordnet Pfade den Modi zu, Unbekanntes der Szene', () => {
    expect(shellModeFromPath('')).toBe('scene');
    expect(shellModeFromPath('umgebung')).toBe('map');
    expect(shellModeFromPath('genom')).toBe('gen');
    expect(shellModeFromPath('modell')).toBe('scene');
  });

  it('ist die Umkehrung von SHELL_MODE_PATHS', () => {
    for (const [mode, path] of Object.entries(SHELL_MODE_PATHS)) {
      expect(shellModeFromPath(path)).toBe(mode);
    }
  });
});

describe('neighborMode', () => {
  it('zoomt von der Szene hinaus zur Karte und hinein zum Genom', () => {
    expect(neighborMode('scene', 'out')).toBe('map');
    expect(neighborMode('scene', 'in')).toBe('gen');
    expect(neighborMode('map', 'in')).toBe('scene');
    expect(neighborMode('gen', 'out')).toBe('scene');
  });

  it('endet an Karte und Genom', () => {
    expect(neighborMode('map', 'out')).toBeNull();
    expect(neighborMode('gen', 'in')).toBeNull();
  });
});
