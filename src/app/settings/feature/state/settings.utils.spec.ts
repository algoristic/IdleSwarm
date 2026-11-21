import { DEFAULT_SETTINGS } from '../../domain/models/settings.model';
import { motionOverride, toSettingsView } from './settings.utils';

describe('settings.utils', () => {
  it('bildet die Animationen auf den Override des MotionPreferenceService ab', () => {
    expect(motionOverride('system')).toBeNull();
    expect(motionOverride('full')).toBe(false);
    expect(motionOverride('reduced')).toBe(true);
  });

  it('setzt das Viewmodel aus Einstellungen und Build zusammen', () => {
    expect(toSettingsView(DEFAULT_SETTINGS, { version: '1.0.0', buildTime: null })).toEqual({
      settings: DEFAULT_SETTINGS,
      version: '1.0.0',
      buildTime: null,
    });
  });
});
