import { Component, computed, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';

import { searchCatalog } from '../../domain/catalog-logic';
import { CatalogListComponent } from '../../ui/catalog-list/catalog-list.component';
import { CATALOG_CATEGORY_NAMES, CATALOG_ENTRY_NAMES } from '../../ui/texts/catalog-texts';
import { CatalogSearchModel } from './catalog.model';

@Component({
  selector: 'app-catalog-page',
  imports: [CatalogListComponent, FormField, FormRoot],
  templateUrl: './catalog.page.html',
  host: { class: 'mx-auto block max-w-5xl p-4' },
})
export class CatalogPage {
  searchModel = signal<CatalogSearchModel>({ query: '' });
  searchForm = form(this.searchModel);

  groups = computed(() =>
    searchCatalog(this.searchModel().query, CATALOG_ENTRY_NAMES, CATALOG_CATEGORY_NAMES),
  );

  searchPlaceholder = $localize`:@@featureDev-catalog-search-placeholder:Name oder Kategorie`;
}
