import { SiteTypeId } from '../../domain/models/site.model';
import { UnitId } from '../../domain/models/unit.model';
import { EaterDesignId } from './eater-design/eater-design.model';

type Colors = Readonly<Record<string, string>>;

export const UNIT_SPRITE_COLORS = {
  eater: {
    glow: '#c08cff',
    rim: '#5b2a9c',
    body: '#c9a6ff',
    shade: '#a77ff0',
    inner: '#9a68ea',
    nucleus: '#4b1f8a',
    vacuole: '#efe6ff',
    alga: '#5fd06a',
  },
  brooder: {
    rim: '#7a2560',
    body: '#ff9cc4',
    shade: '#ff4f8b',
    belly: '#d8336f',
    egg: '#ffd23f',
    eggHighlight: '#fff4b8',
  },
  eggBearer: {
    rim: '#4b2a8f',
    light: '#c7a6ff',
    body: '#9b6bff',
    egg: '#ffd23f',
    eggHighlight: '#fff4b8',
  },
  clutch: { rim: '#5e3a14', egg: '#ffd23f', eggHighlight: '#ffe98a' },
  broodClump: { rim: '#6a1a6b', body: '#ff4f8b', light: '#ff9cc4', egg: '#ffd23f' },
  primalNest: {
    rim: '#2a1060',
    shell: '#9b6bff',
    shellShade: '#6c3fd6',
    core: '#ff8a3d',
    coreShade: '#e5612a',
    egg: '#ffd23f',
    eggHighlight: '#fff4b8',
  },
} as const satisfies Readonly<Record<UnitId, Colors>>;

export const EATER_DESIGN_COLORS = {
  paramecium: {
    glow: '#3ee6c0',
    rim: '#137a6c',
    body: '#4fe0b0',
    shade: '#2bb894',
    groove: '#16806f',
    cilia: '#b4f7dc',
    nucleus: '#0e5d57',
    micronucleus: '#2a9a83',
    vacuole: '#a6f2d6',
    food: '#ffd23f',
  },
  bacillus: {
    glow: '#ff4f8b',
    rim: '#9e1f5a',
    body: '#ff6fa8',
    shade: '#e0458a',
    flagellum: '#ffb0cf',
    nucleoid: '#b22a6a',
    strand: '#8a1a50',
    ribosome: '#ffd0e2',
  },
  dinoflagellate: {
    glow: '#3ee6e0',
    rim: '#932c12',
    body: '#ff8a3d',
    plate: '#ff6a2a',
    shade: '#e0521f',
    suture: '#a8361a',
    groove: '#7a2610',
    flagellum: '#ffd0a8',
  },
  heliozoan: {
    glow: '#ffd23f',
    rim: '#c07a12',
    body: '#ffc83a',
    shade: '#f0a522',
    ray: '#ffe98a',
    granule: '#fff4b8',
    bubble: '#ffe48a',
    core: '#d9771a',
  },
  diatom: {
    glow: '#8fd8ff',
    rim: '#2a64a8',
    body: '#7fc8f4',
    shade: '#5aa6e0',
    stria: '#3f82c8',
    raphe: '#24589a',
    chloroplast: '#e6aa2a',
    chloroplastShade: '#c08418',
    sheen: '#e6f7ff',
  },
  stentor: {
    glow: '#6a8cff',
    rim: '#26389a',
    body: '#5a82ff',
    shade: '#3f62dc',
    stripe: '#3550c0',
    peristome: '#22307e',
    cilia: '#c9d8ff',
    nucleus: '#1c2670',
  },
  spiral: {
    glow: '#b6f23a',
    rim: '#5a2a8c',
    body: '#b6f23a',
    shade: '#7cc42c',
    lip: '#d4ff7a',
    particle: '#f3ffe0',
  },
  prism: {
    glow: '#ff4a5e',
    rim: '#7a0f24',
    light: '#ff8a96',
    body: '#f0354e',
    shade: '#c21d3a',
    deep: '#8f1430',
    edge: '#ffb3bb',
    shard: '#ff6b7c',
  },
} as const satisfies Readonly<Record<EaterDesignId, Colors>>;

export const SPARKLE_COLOR = '#ffe98a';

export const LOCKED_UNIT_ICON_COLORS = { ring: '#5a64b8', mark: '#7c84c4' } as const;

export const ZONE_MOOD_KINDS = ['drops', 'rocks', 'cliffs', 'grass', 'abyss'] as const;
export type ZoneMoodKind = (typeof ZONE_MOOD_KINDS)[number];

export interface ZoneMood {
  deep: string;
  mid: string;
  light: string;
  shape: string;
  glow: string;
  kind: ZoneMoodKind;
}

// Fünf Stimmungen für vier Zonen: die letzte ist die Ferne hinter der letzten Zone
export const ZONE_MOODS: readonly Readonly<ZoneMood>[] = [
  {
    deep: '#0a0d2e',
    mid: '#12174e',
    light: '#1c2470',
    shape: '#070923',
    glow: '#3ee6e0',
    kind: 'drops',
  },
  {
    deep: '#06222e',
    mid: '#0b3442',
    light: '#135260',
    shape: '#04161f',
    glow: '#3ee6e0',
    kind: 'rocks',
  },
  {
    deep: '#140d36',
    mid: '#1f164f',
    light: '#2d216c',
    shape: '#0c0824',
    glow: '#9b6bff',
    kind: 'cliffs',
  },
  {
    deep: '#0a2a48',
    mid: '#11406a',
    light: '#1b5d8c',
    shape: '#0a3a34',
    glow: '#ffd23f',
    kind: 'grass',
  },
  {
    deep: '#04051a',
    mid: '#080a26',
    light: '#0d1036',
    shape: '#020312',
    glow: '#5a64b8',
    kind: 'abyss',
  },
];

export interface SiteColors {
  base: string;
  shade: string;
  mid: string;
  top: string;
  dot: readonly [string, string];
}

export const SITE_COLORS: Readonly<Record<SiteTypeId, Readonly<SiteColors>>> = {
  algae: {
    base: '#1f8a64',
    shade: '#0f5a4f',
    mid: '#136b53',
    top: '#187a57',
    dot: ['#23885d', '#4cc070'],
  },
  plankton: {
    base: '#233e8b',
    shade: '#1a2c6a',
    mid: '#275597',
    top: '#2f68ad',
    dot: ['#8ffcff', '#5fd3e0'],
  },
  carcass: {
    base: '#c4532c',
    shade: '#7a2e1c',
    mid: '#e5612a',
    top: '#ff8a52',
    dot: ['#ffb07a', '#ffd0a0'],
  },
  marineSnow: {
    base: '#2f3a7d',
    shade: '#1f275c',
    mid: '#374287',
    top: '#43509b',
    dot: ['#f6f4ff', '#c6e6f5'],
  },
  seagrass: {
    base: '#136b53',
    shade: '#0b4038',
    mid: '#1e7e66',
    top: '#22a86a',
    dot: ['#8cf25a', '#4cc070'],
  },
};

export interface SceneMood {
  light: string;
  mid: string;
  deep: string;
  glow: string;
}

export const SITE_MOODS: Readonly<Record<SiteTypeId, Readonly<SceneMood>>> = {
  algae: { light: '#1d6a5c', mid: '#0f3f44', deep: '#08202c', glow: '#8cf25a' },
  plankton: { light: '#22489a', mid: '#152c66', deep: '#0a1438', glow: '#8ffcff' },
  carcass: { light: '#5a2a4a', mid: '#341a3c', deep: '#170c24', glow: '#ff8a52' },
  marineSnow: { light: '#2e3a86', mid: '#1b2258', deep: '#0b0f30', glow: '#f6f4ff' },
  seagrass: { light: '#1f7060', mid: '#0f4440', deep: '#06221e', glow: '#ffd23f' },
};

export const SCENE_COLORS = {
  travelDeep: '#05061a',
  drift: ['#8ea6dc', '#5a6fb8', '#c6e6f5'],
  hazeSpeck: '#8ea6dc',
  carcassLegs: '#ff6a3d',
  seagrassBladeEven: '#8cf25a',
  seagrassBladeOdd: '#22a86a',
} as const;

export const SITE_ICON_COLORS = {
  algae: { shadow: '#22a86a', body: '#8cf25a' },
  plankton: { outer: '#233e8b', inner: '#275597', dots: '#8ffcff' },
  carcass: { legs: '#ff6a3d', shadow: '#ff6a3d', body: '#ffb07a' },
  marineSnow: { body: '#374287', flakes: '#f6f4ff' },
  seagrass: { ground: '#1e7e66', bladeEven: '#22a86a', bladeOdd: '#8cf25a' },
} as const satisfies Readonly<Record<SiteTypeId, Colors>>;

export const MAP_COLORS = {
  water: ['#22308a', '#26359a', '#2a3aa6'],
  ring: { target: '#ffd23f', auto: '#3ee6e0', nextZone: '#8f97d8', nextZoneFind: '#c9b260' },
  find: { outer: '#3b407a', inner: '#6c646b' },
  outsideReach: '#05061a',
  timeRing: '#296ca0',
  reachGlow: '#214382',
  reach: '#3ee6e0',
  route: '#ffd23f',
  routeAuto: '#3ee6e0',
  label: '#f6f4ff',
  labelOutline: '#0c0f33',
  meta: '#a7aee8',
  gold: '#ffd23f',
  teal: '#3ee6e0',
  pink: '#ffa3c2',
  deep: '#8f97d8',
  ringLabel: '#3ee6e0',
} as const;

export const SOMA_COLORS = {
  pink: {
    halo: '#461d6a',
    haloInner: '#64256f',
    body: '#ff9cc4',
    bodyShade: '#ff4f8b',
    nucleus: '#6a1a6b',
    nucleusShade: '#4b0f55',
    nucleolus: '#ff9cc4',
  },
  orange: {
    halo: '#4a1f4a',
    haloInner: '#6e2f52',
    body: '#ffd0a8',
    bodyShade: '#ff8a3d',
    nucleus: '#7a2e1c',
    nucleusShade: '#561a10',
    nucleolus: '#ffd0a8',
  },
} as const;
export type SomaTone = keyof typeof SOMA_COLORS;

export const NEURON_COLORS = {
  background: { base: '#14082f', halos: ['#1a0b3d', '#210f4a', '#291358', '#311766'] },
  organelle: { body: '#542b53', mid: '#733c4f', inner: '#a4655e', speck: '#3a1f54' },
  twig: { stroke: '#6d2668', terminal: '#d64484' },
  dendrite: { stroke: '#ff4f8b', glow: '#4a1c64', core: '#ff9cc4' },
  axon: { stroke: '#ff4f8b', glow: '#4a1c64' },
  signal: '#8ffcff',
  bead: { fill: '#ffd23f', next: '#8a3a5c', nextStroke: '#ffd23f' },
  node: {
    body: '#ffe98a',
    shade: '#ffd23f',
    poorBody: '#8f7fb8',
    poorShade: '#6c5c9c',
    pulse: '#ffd23f',
    rank: '#1a1440',
    selection: '#fff',
  },
  label: {
    name: '#fff',
    outline: '#1a0b3d',
    cost: '#ffd23f',
    costPoor: '#b7a2e8',
    mile: '#e9dcff',
    mileOn: '#3ee6e0',
    mileSub: '#b7a2e8',
    chainTitle: '#ffb27a',
    chainCost: '#ffb27a',
  },
  myelin: { fill: '#34207a', on: '#ff8a3d', nextStroke: '#ffd23f' },
  ranvier: { fill: '#1a0b3d', stroke: '#ff9cc4', on: '#3ee6e0' },
  chainDendrite: { stroke: '#ff8a3d', glow: '#4f2147', core: '#ffd0a8', locked: '#5d3f8f' },
  synapse: { fill: '#ff8a3d', stroke: '#4f2147', inner: '#ffd0a8' },
  chainNode: {
    body: '#2a1462',
    ring: '#ff8a3d',
    pulse: '#ff8a3d',
    badge: '#ffd23f',
    badgeStroke: '#1a0b3d',
    rank: '#1a1440',
    lockedRing: '#8a6cc8',
    lockedBadge: '#5d4a95',
  },
} as const;
