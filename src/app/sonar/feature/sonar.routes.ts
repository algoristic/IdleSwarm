import { Routes } from '@angular/router';

import { SonarPage } from './sonar/sonar.page';
import { provideSonarState } from './state/sonar.providers';

export const sonarRoutes: Routes = [
  { path: '', component: SonarPage, providers: [provideSonarState()] },
];
