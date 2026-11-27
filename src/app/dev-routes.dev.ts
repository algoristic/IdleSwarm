import { Routes } from '@angular/router';

export const appDevRoutes: Routes = [
  {
    path: '',
    loadChildren: async () => (await import('@app/dev/feature/dev.routes')).devRoutes,
  },
];
