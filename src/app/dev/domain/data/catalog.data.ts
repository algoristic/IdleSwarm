import { SITE_TYPE_IDS } from '@app/game/domain/models/site.model';
import { ZONE_IDS } from '@app/game/domain/models/zone.model';

import { CatalogChoiceControlId, CatalogEntry } from '../models/catalog.model';

export const CATALOG_ENTRIES: readonly CatalogEntry[] = [
  { id: 'unit-sprite', category: 'units', preview: 'art', controls: [] },
  { id: 'eater-designs', category: 'units', preview: 'art', controls: ['zone', 'motion'] },
  { id: 'unit-icon', category: 'units', preview: 'art', controls: [] },
  { id: 'sparkle-sprite', category: 'units', preview: 'art', controls: [] },
  {
    id: 'swarm-canvas',
    category: 'swarm',
    preview: 'art',
    controls: ['level', 'site', 'zone', 'motion'],
  },
  { id: 'map-swarm', category: 'swarm', preview: 'map', controls: ['level', 'motion'] },
  { id: 'scene-site', category: 'sites', preview: 'art', controls: ['site', 'shape', 'fill'] },
  {
    id: 'map-site',
    category: 'sites',
    preview: 'map',
    controls: ['site', 'shape', 'fill', 'mapZone', 'siteHighlight', 'dead', 'here'],
  },
  {
    id: 'map-current-site',
    category: 'sites',
    preview: 'map',
    controls: ['site', 'shape', 'fill', 'dead'],
  },
  { id: 'map-site-icon', category: 'sites', preview: 'map', controls: ['shape'] },
  { id: 'map-find', category: 'finds', preview: 'map', controls: ['mapZone', 'findHighlight'] },
  { id: 'far-mood', category: 'backdrops', preview: 'art', controls: ['mood'] },
  { id: 'zone-haze', category: 'backdrops', preview: 'art', controls: ['zone'] },
  { id: 'scene-backdrop', category: 'backdrops', preview: 'art', controls: ['backdrop', 'zone'] },
  { id: 'map-water', category: 'backdrops', preview: 'map', controls: ['zone'] },
  {
    id: 'backdrop-stack',
    category: 'backdrops',
    preview: 'parallax',
    controls: ['zone', 'blur'],
  },
  {
    id: 'swarm-travel',
    category: 'travel',
    preview: 'art',
    controls: ['level', 'direction', 'zone', 'motion'],
  },
  { id: 'neuron-backdrop', category: 'neuron', preview: 'neuron', controls: ['showChain'] },
  { id: 'neuron-soma', category: 'neuron', preview: 'neuron', controls: ['tone'] },
  {
    id: 'upgrade-node',
    category: 'neuron',
    preview: 'neuron',
    controls: ['upgradeState', 'rank', 'motion'],
  },
  {
    id: 'chain-node',
    category: 'neuron',
    preview: 'neuron',
    controls: ['chainUnit', 'chainState', 'rank', 'motion'],
  },
  {
    id: 'swarm-neuron',
    category: 'neuron',
    preview: 'neuron',
    controls: ['upgradeState', 'rank', 'motion'],
  },
  {
    id: 'chain-neuron',
    category: 'neuron',
    preview: 'neuron',
    controls: ['chainState', 'rank', 'motion'],
  },
  {
    id: 'neuron-pair',
    category: 'neuron',
    preview: 'neuron',
    controls: ['upgradeState', 'rank', 'motion'],
  },
  { id: 'button', category: 'ui', preview: 'shared', controls: [] },
  { id: 'tag', category: 'ui', preview: 'shared', controls: [] },
  { id: 'segment', category: 'ui', preview: 'shared', controls: [] },
  { id: 'pill', category: 'ui', preview: 'shared', controls: ['fill'] },
  { id: 'bottom-sheet', category: 'ui', preview: 'shared', controls: [] },
  { id: 'toast', category: 'ui', preview: 'shared', controls: [] },
  { id: 'dialog-frame', category: 'ui', preview: 'shared', controls: [] },
  { id: 'pipes', category: 'ui', preview: 'shared', controls: [] },
];

const indexOptions = (count: number): string[] => Array.from({ length: count }, (_, i) => `${i}`);

export const CATALOG_CHOICE_OPTIONS = {
  site: SITE_TYPE_IDS,
  backdrop: [...SITE_TYPE_IDS, 'travel', 'none'],
  zone: indexOptions(ZONE_IDS.length),
  mood: indexOptions(ZONE_IDS.length + 1),
  direction: ['-90', '0', '90', '180'],
  shape: ['4242', '13', '271828', '777777'],
  fill: ['0', '25', '50', '75', '100'],
  mapZone: ['current', 'next'],
  siteHighlight: ['none', 'target', 'auto'],
  findHighlight: ['none', 'target'],
  dead: ['off', 'on'],
  here: ['off', 'on'],
  chainUnit: ['eater', 'brooder', 'eggBearer', 'clutch'],
  upgradeState: ['affordable', 'poor', 'selected'],
  chainState: ['affordable', 'poor', 'selected', 'locked'],
  rank: ['0', '1', '3', '5', '12'],
  tone: ['pink', 'orange'],
  showChain: ['off', 'on'],
  motion: ['on', 'off'],
  blur: ['on', 'off'],
} as const satisfies Readonly<Record<CatalogChoiceControlId, readonly string[]>>;

export type CatalogChoice<K extends CatalogChoiceControlId> =
  (typeof CATALOG_CHOICE_OPTIONS)[K][number];

export type CatalogDefaultControls = { [K in CatalogChoiceControlId]: CatalogChoice<K> } & {
  level: number;
};

export const CATALOG_LEVEL_MAX = 18;

export const CATALOG_DEFAULT_CONTROLS: Readonly<CatalogDefaultControls> = {
  level: 7,
  site: 'algae',
  backdrop: 'algae',
  zone: '0',
  mood: '1',
  direction: '0',
  shape: '4242',
  fill: '100',
  mapZone: 'current',
  siteHighlight: 'none',
  findHighlight: 'none',
  dead: 'off',
  here: 'off',
  chainUnit: 'eater',
  upgradeState: 'affordable',
  chainState: 'affordable',
  rank: '3',
  tone: 'pink',
  showChain: 'on',
  motion: 'on',
  blur: 'on',
};
