import type { MotionSetting, Settings } from '../../domain/models/settings.model';
import type { SettingsView } from '../../ui/dialog-settings/dialog-settings.component.model';
import type { BuildInfo } from './settings.tokens';

export function toSettingsView(settings: Settings, build: BuildInfo): SettingsView {
  return {
    settings,
    version: build.version,
    buildTime: build.buildTime,
    buildNumber: build.buildNumber,
    commit: build.commit,
  };
}

/**
 * Wert für `MOTION_OVERRIDE` (`MotionPreferenceService`): `system` folgt `prefers-reduced-motion`
 * (`null`), `full` erzwingt volle, `reduced` reduzierte Bewegung.
 */
export function motionOverride(setting: MotionSetting): boolean | null {
  switch (setting) {
    case 'system':
      return null;
    case 'full':
      return false;
    case 'reduced':
      return true;
  }
}
