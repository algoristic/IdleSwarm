import { PRIMARY_OUTLET, UrlTree } from '@angular/router';

import type { ShellMode, ViewportSize } from '../../domain/models/shell-mode.model';
import { stageSize, worldCamera, worldCameraStyle } from '../../domain/shell-camera-logic';
import { shellModeFromPath } from '../../domain/shell-mode-logic';
import type { ShellLayoutView } from './shell.model';

/** Modus zum ersten Segment der Route. */
export function shellModeFromUrl(url: UrlTree): ShellMode {
  return shellModeFromPath(url.root.children[PRIMARY_OUTLET]?.segments[0]?.path ?? '');
}

export function toShellLayout(mode: ShellMode, viewport: ViewportSize): ShellLayoutView {
  const size = stageSize(viewport);
  return {
    stageSize: `${size}px`,
    world: worldCameraStyle(worldCamera(mode, viewport, size)),
  };
}
