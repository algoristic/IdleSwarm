import { Route, Routes } from '@angular/router';

import { provideGenomeState } from '@app/genome/feature/state/genome.providers';
import { provideHudState } from '@app/hud/feature/state/hud.providers';
import { provideSceneState } from '@app/scene/feature/state/scene.providers';
import { provideSettingsState } from '@app/settings/feature/state/settings.providers';
import { provideSonarState } from '@app/sonar/feature/state/sonar.providers';

import { SHELL_MODES } from '../domain/models/shell-mode.model';
import { SHELL_MODE_PATHS } from '../domain/shell-mode-logic';
import { ShellPage } from './shell/shell.page';
import { provideShellState } from './state/shell.providers';

/**
 * Eine Elternroute für alle Modi: Die Kindrouten haben keine Komponente, damit dieselbe
 * `ShellPage` beim Moduswechsel bestehen bleibt und die CSS-Übergänge laufen.
 */
export const shellRoutes: Routes = [
  {
    path: '',
    component: ShellPage,
    providers: [
      provideShellState(),
      provideSceneState(),
      provideHudState(),
      provideSonarState(),
      provideGenomeState(),
      provideSettingsState(),
    ],
    children: SHELL_MODES.map((mode): Route => ({
      path: SHELL_MODE_PATHS[mode],
      pathMatch: 'full',
      children: [],
    })),
  },
];
