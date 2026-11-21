import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';

import type { ShellMode } from '../../domain/models/shell-mode.model';
import { SHELL_MODE_PATHS } from '../../domain/shell-mode-logic';
import { ShellFacade } from './shell.facade';

/**
 * Lässt einen Modus nur zu, wenn er freigeschaltet ist (US-09.04); ein direkter Aufruf einer
 * gesperrten Route (`/umgebung`, `/genom`) führt zur Szene.
 */
export function shellModeGuard(mode: ShellMode): CanActivateFn {
  return () =>
    inject(ShellFacade).isModeUnlocked(mode) ||
    new RedirectCommand(inject(Router).parseUrl(`/${SHELL_MODE_PATHS.scene}`), {
      replaceUrl: true,
    });
}
