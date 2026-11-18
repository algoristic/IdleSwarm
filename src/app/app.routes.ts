import { Routes } from '@angular/router';

import { HudPage } from './ui/hud/hud-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: HudPage },
  { path: '**', redirectTo: '' },
];
