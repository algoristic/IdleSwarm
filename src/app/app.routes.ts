import { Routes } from '@angular/router';

import { modelRouteGuard } from './model/model-route.guard';
import { HudPage } from './ui/hud/hud-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HudPage },
  {
    path: 'modell',
    canMatch: [modelRouteGuard],
    loadComponent: () => import('./model/model-page').then((module) => module.ModelPage),
  },
  { path: '**', redirectTo: '' },
];
