import { EnvironmentProviders, Provider } from '@angular/core';

import { GenomeFacade } from './genome.facade';

export function provideGenomeState(): (Provider | EnvironmentProviders)[] {
  return [GenomeFacade];
}
