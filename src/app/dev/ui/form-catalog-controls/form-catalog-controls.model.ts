import { FieldTree } from '@angular/forms/signals';

import { SegmentOption } from '@app/shared/ui/segment/segment.model';

import { CatalogControlId } from '../../domain/models/catalog.model';

export interface CatalogControlRow {
  id: CatalogControlId;
  label: string;
  testId: string;
  choice: CatalogChoiceRow | null;
}

interface CatalogChoiceRow {
  field: FieldTree<string>;
  options: readonly SegmentOption[];
}
