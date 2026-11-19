import { Routes } from '@angular/router';

import { modelRouteGuard } from '@app/model/feature/state/model.guards';

export const routes: Routes = [
  {
    path: 'modell',
    canMatch: [modelRouteGuard],
    loadChildren: async () => (await import('@app/model/feature/model.routes')).modelRoutes,
  },
  {
    path: 'umgebung',
    loadChildren: async () => (await import('@app/sonar/feature/sonar.routes')).sonarRoutes,
  },
  {
    path: 'genom',
    loadChildren: async () => (await import('@app/genome/feature/genome.routes')).genomeRoutes,
  },
  {
    path: '',
    loadChildren: async () => (await import('@app/hud/feature/hud.routes')).hudRoutes,
  },
  { path: '**', redirectTo: '' },
];
