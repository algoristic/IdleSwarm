import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CatalogGroup } from '../../domain/models/catalog.model';
import { CATALOG_CATEGORY_NAMES, CATALOG_ENTRY_NAMES } from '../texts/catalog-texts';

@Component({
  selector: 'app-catalog-list',
  imports: [RouterLink],
  templateUrl: './catalog-list.component.html',
  host: { class: 'grid gap-5' },
})
export class CatalogListComponent {
  groups = input.required<readonly CatalogGroup[]>();

  categoryNames = CATALOG_CATEGORY_NAMES;
  entryNames = CATALOG_ENTRY_NAMES;
}
