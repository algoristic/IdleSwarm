import { Component, computed, signal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { RouterOutlet } from '@angular/router';

import { searchCatalog } from '../../domain/catalog-logic';
import { CatalogListComponent } from '../../ui/catalog-list/catalog-list.component';
import { CATALOG_CATEGORY_NAMES, CATALOG_ENTRY_NAMES } from '../../ui/texts/catalog-texts';
import { CatalogSearchModel } from './catalog.model';

const SIDEBAR_CLASSES =
  'w-72 shrink-0 overflow-y-auto bg-panel p-3 lg:sticky lg:top-0 lg:z-auto lg:block lg:h-dvh';

@Component({
  selector: 'app-catalog-page',
  imports: [CatalogListComponent, FormField, FormRoot, RouterOutlet],
  templateUrl: './catalog.page.html',
  host: { class: 'block lg:flex', '(document:keydown.escape)': 'onCloseMenu()' },
})
export class CatalogPage {
  searchModel = signal<CatalogSearchModel>({ query: '' });
  searchForm = form(this.searchModel);
  menuOpen = signal(false);

  groups = computed(() =>
    searchCatalog(this.searchModel().query, CATALOG_ENTRY_NAMES, CATALOG_CATEGORY_NAMES),
  );
  sidebarClasses = computed(() =>
    this.menuOpen()
      ? `${SIDEBAR_CLASSES} fixed inset-y-0 left-0 z-40 block`
      : `${SIDEBAR_CLASSES} hidden`,
  );

  searchPlaceholder = $localize`:@@featureDev-catalog-search-placeholder:Name oder Kategorie`;
  closeMenuLabel = $localize`:@@featureDev-catalog-menu-close:Einträge schließen`;

  onOpenMenu(): void {
    this.menuOpen.set(true);
  }

  onCloseMenu(): void {
    this.menuOpen.set(false);
  }
}
