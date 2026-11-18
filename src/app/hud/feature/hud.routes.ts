import { Routes } from '@angular/router';

import { HudPage } from './hud/hud.page';
import { provideHudState } from './state/hud.providers';

export const hudRoutes: Routes = [
  { path: '', pathMatch: 'full', component: HudPage, providers: [provideHudState()] },
];
