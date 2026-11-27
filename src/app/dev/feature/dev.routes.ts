import { Routes } from '@angular/router';

import { CatalogPage } from './catalog/catalog.page';
import { CatalogEntryPage } from './catalog-entry/catalog-entry.page';
import { catalogEntryGuard } from './state/dev.guards';

export const devRoutes: Routes = [
  { path: '', pathMatch: 'full', component: CatalogPage },
  { path: ':entryId', component: CatalogEntryPage, canActivate: [catalogEntryGuard()] },
];
