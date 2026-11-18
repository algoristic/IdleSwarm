import { Routes } from '@angular/router';

import { modelRouteGuard } from '@app/model/feature/state/model.guards';

export const routes: Routes = [
  {
    path: 'modell',
    canMatch: [modelRouteGuard],
    loadChildren: async () => (await import('@app/model/feature/model.routes')).modelRoutes,
  },
  {
    path: '',
    loadChildren: async () => (await import('@app/hud/feature/hud.routes')).hudRoutes,
  },
  { path: '**', redirectTo: '' },
];
