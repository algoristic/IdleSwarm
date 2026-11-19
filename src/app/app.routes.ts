import { Routes } from '@angular/router';

import { modelRouteGuard } from '@app/model/feature/state/model.guards';

export const routes: Routes = [
  {
    path: 'modell',
    canMatch: [modelRouteGuard],
    loadChildren: async () => (await import('@app/model/feature/model.routes')).modelRoutes,
  },
  // Szene (`''`), Umgebung (`umgebung`) und Genom (`genom`) teilen sich die K2-Shell.
  {
    path: '',
    loadChildren: async () => (await import('@app/shell/feature/shell.routes')).shellRoutes,
  },
  { path: '**', redirectTo: '' },
];
