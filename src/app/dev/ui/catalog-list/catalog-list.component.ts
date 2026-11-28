import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { CatalogEntryId, CatalogGroup } from '../../domain/models/catalog.model';
import { CATALOG_CATEGORY_NAMES, CATALOG_ENTRY_NAMES } from '../texts/catalog-texts';

@Component({
  selector: 'app-catalog-list',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './catalog-list.component.html',
  host: { class: 'grid gap-4' },
})
export class CatalogListComponent {
  groups = input.required<readonly CatalogGroup[]>();

  categoryNames = CATALOG_CATEGORY_NAMES;
  entryNames = CATALOG_ENTRY_NAMES;

  selectedEntry = output<CatalogEntryId>();

  onSelectEntry(entry: CatalogEntryId): void {
    this.selectedEntry.emit(entry);
  }
}
