import { Routes } from '@angular/router';

import { appDevRoutes } from './dev-routes';

export const routes: Routes = [
  ...appDevRoutes,
  {
    path: '',
    loadChildren: async () => (await import('@app/game/feature/game.routes')).gameRoutes,
  },
  { path: '**', redirectTo: '' },
];
