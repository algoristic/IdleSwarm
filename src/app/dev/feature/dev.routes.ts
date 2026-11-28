import { Routes } from '@angular/router';

import { CATALOG_ENTRY_IDS } from '../domain/models/catalog.model';
import { CatalogPage } from './catalog/catalog.page';
import { CatalogEntryPage } from './catalog-entry/catalog-entry.page';
import { catalogEntryGuard } from './state/dev.guards';

export const devRoutes: Routes = [
  {
    path: '',
    component: CatalogPage,
    children: [
      { path: '', pathMatch: 'full', redirectTo: CATALOG_ENTRY_IDS[0] },
      { path: ':entryId', component: CatalogEntryPage, canActivate: [catalogEntryGuard()] },
    ],
  },
];
