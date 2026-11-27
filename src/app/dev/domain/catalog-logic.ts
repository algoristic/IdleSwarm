import { UNIT_IDS } from '@app/game/domain/models/unit.model';

import {
  CATALOG_CHOICE_OPTIONS,
  CatalogChoice,
  CATALOG_DEFAULT_CONTROLS,
  CATALOG_ENTRIES,
  CATALOG_LEVEL_MAX,
} from './data/catalog.data';
import {
  CATALOG_CATEGORY_IDS,
  CATALOG_ENTRY_IDS,
  CatalogCategoryId,
  CatalogChoiceControlId,
  CatalogControls,
  CatalogControlsModel,
  CatalogEntry,
  CatalogEntryId,
  CatalogGroup,
} from './models/catalog.model';

interface CatalogNeighbours {
  previous: CatalogEntryId | null;
  next: CatalogEntryId | null;
}

export function isCatalogEntryId(value: string | null | undefined): value is CatalogEntryId {
  return CATALOG_ENTRY_IDS.some((id) => id === value);
}

export function catalogEntry(id: CatalogEntryId): CatalogEntry {
  const entry = CATALOG_ENTRIES.find((candidate) => candidate.id === id);
  return entry ?? { id, category: 'ui', preview: 'shared', controls: [] };
}

export function catalogNeighbours(id: CatalogEntryId): CatalogNeighbours {
  const index = CATALOG_ENTRIES.findIndex((entry) => entry.id === id);
  return {
    previous: index > 0 ? CATALOG_ENTRIES[index - 1].id : null,
    next: index >= 0 && index < CATALOG_ENTRIES.length - 1 ? CATALOG_ENTRIES[index + 1].id : null,
  };
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function searchCatalog(
  query: string,
  entryNames: Readonly<Record<CatalogEntryId, string>>,
  categoryNames: Readonly<Record<CatalogCategoryId, string>>,
): CatalogGroup[] {
  const needle = normalizeQuery(query);
  const matches = (entry: CatalogEntry): boolean =>
    needle === '' ||
    entryNames[entry.id].toLowerCase().includes(needle) ||
    categoryNames[entry.category].toLowerCase().includes(needle);
  return CATALOG_CATEGORY_IDS.map((category) => ({
    category,
    entries: CATALOG_ENTRIES.filter((entry) => entry.category === category && matches(entry)).map(
      (entry) => entry.id,
    ),
  })).filter((group) => group.entries.length > 0);
}

export function unitsForLevel(level: number): number[] {
  return UNIT_IDS.map((_, k) => {
    const exponent = (level - 2 * k - 1) / 2;
    return exponent < 0 ? 0 : Math.floor(10 ** exponent);
  });
}

export function parseLevel(value: number): number {
  if (!Number.isFinite(value)) return CATALOG_DEFAULT_CONTROLS.level;
  return Math.min(CATALOG_LEVEL_MAX, Math.max(0, Math.round(value)));
}

function choice<K extends CatalogChoiceControlId>(
  model: CatalogControlsModel,
  id: K,
): CatalogChoice<K> {
  const options: readonly CatalogChoice<K>[] = CATALOG_CHOICE_OPTIONS[id];
  return options.find((option) => option === model[id]) ?? CATALOG_DEFAULT_CONTROLS[id];
}

const numberChoice = (model: CatalogControlsModel, id: CatalogChoiceControlId): number =>
  Number(choice(model, id));
const flagChoice = (model: CatalogControlsModel, id: CatalogChoiceControlId): boolean =>
  choice(model, id) === 'on';

export function parseCatalogControls(model: CatalogControlsModel): CatalogControls {
  const level = parseLevel(model.level);
  return {
    level,
    units: unitsForLevel(level),
    site: choice(model, 'site'),
    backdrop: choice(model, 'backdrop'),
    zone: numberChoice(model, 'zone'),
    mood: numberChoice(model, 'mood'),
    direction: numberChoice(model, 'direction'),
    shape: numberChoice(model, 'shape'),
    fill: numberChoice(model, 'fill') / 100,
    mapZone: choice(model, 'mapZone'),
    siteHighlight: choice(model, 'siteHighlight'),
    findHighlight: choice(model, 'findHighlight'),
    dead: flagChoice(model, 'dead'),
    here: flagChoice(model, 'here'),
    chainUnit: choice(model, 'chainUnit'),
    upgradeState: choice(model, 'upgradeState'),
    chainState: choice(model, 'chainState'),
    rank: numberChoice(model, 'rank'),
    tone: choice(model, 'tone'),
    showChain: flagChoice(model, 'showChain'),
    motion: flagChoice(model, 'motion'),
  };
}
