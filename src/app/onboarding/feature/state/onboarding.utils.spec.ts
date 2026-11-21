import { HINT_IDS } from '../../domain/models/onboarding.model';
import { HINT_MODES, hintForMode } from './onboarding.utils';

describe('hintForMode', () => {
  it('zeigt in der Szene den ersten offenen Hinweis der Szene', () => {
    expect(hintForMode(['collect', 'pheromones', 'auto-move'], 'scene')).toBe('collect');
    expect(hintForMode(['map', 'genome'], 'scene')).toBe('map');
  });

  it('zeigt Auto-Weiterziehen nur in der Umgebung', () => {
    expect(hintForMode(['map', 'auto-move'], 'map')).toBe('auto-move');
    expect(hintForMode(['auto-move'], 'scene')).toBeNull();
  });

  it('zeigt im Genom und ohne offene Hinweise keinen', () => {
    expect(hintForMode([...HINT_IDS], 'gen')).toBeNull();
    expect(hintForMode([], 'scene')).toBeNull();
  });

  it('ordnet jedem Hinweis einen Modus zu', () => {
    expect(Object.keys(HINT_MODES)).toEqual([...HINT_IDS]);
  });
});
