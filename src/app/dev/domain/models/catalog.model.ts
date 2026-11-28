import type { CatalogChoice } from '../data/catalog.data';

export const CATALOG_CATEGORY_IDS = [
  'units',
  'swarm',
  'sites',
  'finds',
  'backdrops',
  'travel',
  'neuron',
  'ui',
] as const;
export type CatalogCategoryId = (typeof CATALOG_CATEGORY_IDS)[number];

export const CATALOG_ENTRY_IDS = [
  'unit-sprite',
  'eater-designs',
  'unit-icon',
  'sparkle-sprite',
  'swarm-canvas',
  'map-swarm',
  'scene-site',
  'map-site',
  'map-current-site',
  'map-site-icon',
  'map-find',
  'far-mood',
  'zone-haze',
  'scene-backdrop',
  'map-water',
  'backdrop-stack',
  'swarm-travel',
  'neuron-backdrop',
  'neuron-soma',
  'upgrade-node',
  'chain-node',
  'swarm-neuron',
  'chain-neuron',
  'neuron-pair',
  'button',
  'tag',
  'segment',
  'pill',
  'bottom-sheet',
  'toast',
  'dialog-frame',
  'pipes',
] as const;
export type CatalogEntryId = (typeof CATALOG_ENTRY_IDS)[number];

export const CATALOG_CONTROL_IDS = [
  'level',
  'site',
  'backdrop',
  'zone',
  'mood',
  'direction',
  'shape',
  'fill',
  'mapZone',
  'siteHighlight',
  'findHighlight',
  'dead',
  'here',
  'chainUnit',
  'upgradeState',
  'chainState',
  'rank',
  'tone',
  'showChain',
  'motion',
  'blur',
] as const;
export type CatalogControlId = (typeof CATALOG_CONTROL_IDS)[number];

export const CATALOG_PREVIEW_KINDS = ['art', 'map', 'neuron', 'shared', 'parallax'] as const;
export type CatalogPreviewKind = (typeof CATALOG_PREVIEW_KINDS)[number];

export type CatalogChoiceControlId = Exclude<CatalogControlId, 'level'>;

export interface CatalogEntry {
  id: CatalogEntryId;
  category: CatalogCategoryId;
  preview: CatalogPreviewKind;
  controls: readonly CatalogControlId[];
}

export interface CatalogGroup {
  category: CatalogCategoryId;
  entries: readonly CatalogEntryId[];
}

export type CatalogControlsModel = Record<CatalogChoiceControlId, string> & { level: number };

export interface CatalogControls {
  level: number;
  units: readonly number[];
  site: CatalogChoice<'site'>;
  backdrop: CatalogChoice<'backdrop'>;
  zone: number;
  mood: number;
  direction: number;
  shape: number;
  fill: number;
  mapZone: CatalogChoice<'mapZone'>;
  siteHighlight: CatalogChoice<'siteHighlight'>;
  findHighlight: CatalogChoice<'findHighlight'>;
  dead: boolean;
  here: boolean;
  chainUnit: CatalogChoice<'chainUnit'>;
  upgradeState: CatalogChoice<'upgradeState'>;
  chainState: CatalogChoice<'chainState'>;
  rank: number;
  tone: CatalogChoice<'tone'>;
  showChain: boolean;
  motion: boolean;
  blur: boolean;
}
