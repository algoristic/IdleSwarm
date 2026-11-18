import { Routes } from '@angular/router';

import { StatusPage } from './ui/status/status-page';

export const routes: Routes = [
  { path: '', pathMatch: 'full', component: StatusPage },
  { path: '**', redirectTo: '' },
];
