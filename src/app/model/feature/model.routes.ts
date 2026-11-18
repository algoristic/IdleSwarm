import { Routes } from '@angular/router';

import { ModelPage } from './model/model.page';
import { provideModelState } from './state/model.providers';

export const modelRoutes: Routes = [
  { path: '', component: ModelPage, providers: [provideModelState()] },
];
