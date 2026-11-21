import { EnvironmentProviders, Provider } from '@angular/core';

import { OnboardingFacade } from './onboarding.facade';

export function provideOnboardingState(): (Provider | EnvironmentProviders)[] {
  return [OnboardingFacade];
}
