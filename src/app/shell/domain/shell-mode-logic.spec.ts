import { START_ONBOARDING } from '@app/onboarding/domain/onboarding-logic';

import {
  neighborMode,
  SHELL_MODE_PATHS,
  shellModeFromPath,
  unlockedModes,
} from './shell-mode-logic';

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

describe('unlockedModes', () => {
  it('zeigt im neuen Spiel nur die Szene', () => {
    expect(unlockedModes(START_ONBOARDING)).toEqual(['scene']);
  });

  it('schaltet Karte mit `map` und Genom mit `genome` frei, in Zoom-Reihenfolge', () => {
    expect(unlockedModes({ unlocked: ['map'], seenHints: [] })).toEqual(['map', 'scene']);
    expect(unlockedModes({ unlocked: ['pheromones', 'genome'], seenHints: [] })).toEqual([
      'scene',
      'gen',
    ]);
    expect(unlockedModes({ unlocked: ['map', 'genome'], seenHints: [] })).toEqual([
      'map',
      'scene',
      'gen',
    ]);
  });
});

describe('neighborMode mit gesperrten Modi', () => {
  it('bleibt ohne freigeschaltete Nachbarn in der Szene', () => {
    expect(neighborMode('scene', 'out', ['scene'])).toBeNull();
    expect(neighborMode('scene', 'in', ['scene'])).toBeNull();
  });

  it('überspringt gesperrte Modi und erreicht nur freigeschaltete', () => {
    expect(neighborMode('scene', 'in', ['map', 'scene'])).toBeNull();
    expect(neighborMode('scene', 'out', ['map', 'scene'])).toBe('map');
    expect(neighborMode('map', 'in', ['map', 'gen'])).toBe('gen');
    expect(neighborMode('gen', 'out', ['scene', 'gen'])).toBe('scene');
  });
});
