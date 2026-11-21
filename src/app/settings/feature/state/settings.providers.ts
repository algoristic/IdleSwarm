import { computed, EnvironmentProviders, inject, Provider } from '@angular/core';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';
import { MOTION_OVERRIDE } from '@app/shared/data-access/motion-preference/motion-preference-service.tokens';
import { NUMBER_NOTATION } from '@app/shared/ui/pipes/number-notation/number-notation.token';

import { SettingsFacade } from './settings.facade';
import { motionOverride } from './settings.utils';

/** Einstellungen der Shell: Facade und das eingestellte Zahlenformat für die Zahlen-Pipes. */
export function provideSettingsState(): (Provider | EnvironmentProviders)[] {
  return [
    SettingsFacade,
    { provide: NUMBER_NOTATION, useFactory: () => inject(SettingsFacade).numberNotation },
  ];
}

/**
 * Stellt die Animationen-Einstellung app-weit als Quelle des `MotionPreferenceService` bereit (TK
 * §8.5), auch auf `/modell` und nach Laden, Import oder Zurücksetzen. Gehört in den Bootstrap.
 */
export function provideAppliedSettings(): Provider {
  return {
    provide: MOTION_OVERRIDE,
    useFactory: () => {
      const store = inject(GameStore);
      return computed(() => motionOverride(store.state().settings.motion));
    },
  };
}
