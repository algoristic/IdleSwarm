import { Routes } from '@angular/router';

import { GamePage } from './game/game.page';
import { MapPage } from './map/map.page';
import { GameViewId } from './state/game.model';
import { provideGameState } from './state/game.providers';
import { SwarmPage } from './swarm/swarm.page';
import { UpgradesPage } from './upgrades/upgrades.page';

export const gameRoutes: Routes = [
  {
    path: '',
    component: GamePage,
    providers: [provideGameState()],
    children: [
      {
        path: '',
        pathMatch: 'full',
        component: SwarmPage,
        data: { view: 'swarm' satisfies GameViewId },
      },
      { path: 'umgebung', component: MapPage, data: { view: 'map' satisfies GameViewId } },
      { path: 'ausbau', component: UpgradesPage, data: { view: 'upgrades' satisfies GameViewId } },
    ],
  },
];
