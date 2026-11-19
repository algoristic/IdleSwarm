import { EnvironmentProviders, Provider } from '@angular/core';

import { ShellFacade } from './shell.facade';

export function provideShellState(): (Provider | EnvironmentProviders)[] {
  return [ShellFacade];
}
