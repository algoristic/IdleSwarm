import { Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { GAME_CONFIG } from '@app/game/data-access/game-store/game-store-service.tokens';

import {
  catalogEntry,
  catalogNeighbours,
  isCatalogEntryId,
  parseCatalogControls,
} from '../../domain/catalog-logic';
import { CATALOG_DEFAULT_CONTROLS } from '../../domain/data/catalog.data';
import { CatalogControlsModel, CatalogEntry } from '../../domain/models/catalog.model';
import { CatalogArtPreviewComponent } from '../../ui/catalog-art-preview/catalog-art-preview.component';
import { CatalogMapPreviewComponent } from '../../ui/catalog-map-preview/catalog-map-preview.component';
import { CatalogNeuronPreviewComponent } from '../../ui/catalog-neuron-preview/catalog-neuron-preview.component';
import { CatalogSharedPreviewComponent } from '../../ui/catalog-shared-preview/catalog-shared-preview.component';
import { FormCatalogControlsComponent } from '../../ui/form-catalog-controls/form-catalog-controls.component';
import { CATALOG_CATEGORY_NAMES, CATALOG_ENTRY_NAMES } from '../../ui/texts/catalog-texts';

@Component({
  selector: 'app-catalog-entry-page',
  imports: [
    CatalogArtPreviewComponent,
    CatalogMapPreviewComponent,
    CatalogNeuronPreviewComponent,
    CatalogSharedPreviewComponent,
    FormCatalogControlsComponent,
    RouterLink,
  ],
  templateUrl: './catalog-entry.page.html',
  host: { class: 'mx-auto block max-w-6xl p-4' },
})
export class CatalogEntryPage {
  config = inject(GAME_CONFIG);
  readonly #route = inject(ActivatedRoute);

  categoryNames = CATALOG_CATEGORY_NAMES;
  entryNames = CATALOG_ENTRY_NAMES;

  #params = toSignal(this.#route.paramMap, { initialValue: this.#route.snapshot.paramMap });

  entry = computed(() => {
    const id = this.#params().get('entryId');
    return catalogEntry(isCatalogEntryId(id) ? id : 'unit-sprite');
  });
  neighbours = computed(() => catalogNeighbours(this.entry().id));

  controlsModel = linkedSignal<CatalogEntry, CatalogControlsModel>({
    source: this.entry,
    computation: () => ({ ...CATALOG_DEFAULT_CONTROLS }),
  });
  controls = computed(() => parseCatalogControls(this.controlsModel()));

  dialogOpen = linkedSignal({ source: this.entry, computation: () => false });
  sheetCollapsed = linkedSignal({ source: this.entry, computation: () => false });
  toasts = linkedSignal<CatalogEntry, readonly number[]>({
    source: this.entry,
    computation: () => [],
  });
  segmentChoice = linkedSignal({ source: this.entry, computation: () => 'one' });
  #nextToastId = 1;

  onOpenDialog(): void {
    this.dialogOpen.set(true);
  }

  onCloseDialog(): void {
    this.dialogOpen.set(false);
  }

  onChangedSheetCollapsed(collapsed: boolean): void {
    this.sheetCollapsed.set(collapsed);
  }

  onShowToast(): void {
    const id = this.#nextToastId++;
    this.toasts.update((toasts) => [...toasts, id].slice(-2));
  }

  onExpiredToast(id: number): void {
    this.toasts.update((toasts) => toasts.filter((toast) => toast !== id));
  }

  onSelectSegment(id: string): void {
    this.segmentChoice.set(id);
  }
}
