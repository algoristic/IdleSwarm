import { ZONE_IDS } from '@app/game/domain/models/zone.model';
import { EaterDesignId } from '@app/game/ui/art/eater-design/eater-design.model';
import { SITE_TYPE_NAMES, UNIT_TEXTS, ZONE_NAMES } from '@app/game/ui/texts/game-texts';
import { formatNumber } from '@app/shared/util/format';

import { CATALOG_CHOICE_OPTIONS } from '../../domain/data/catalog.data';
import {
  CatalogCategoryId,
  CatalogChoiceControlId,
  CatalogControlId,
  CatalogEntryId,
} from '../../domain/models/catalog.model';

export const CATALOG_CATEGORY_NAMES: Readonly<Record<CatalogCategoryId, string>> = {
  units: $localize`:@@uiDev-catalogTexts-category-units:Einheiten`,
  swarm: $localize`:@@uiDev-catalogTexts-category-swarm:Schwarm`,
  sites: $localize`:@@uiDev-catalogTexts-category-sites:Futterstellen`,
  finds: $localize`:@@uiDev-catalogTexts-category-finds:Fundstücke`,
  backdrops: $localize`:@@uiDev-catalogTexts-category-backdrops:Hintergründe`,
  travel: $localize`:@@uiDev-catalogTexts-category-travel:Reise und Drift`,
  neuron: $localize`:@@uiDev-catalogTexts-category-neuron:Neuron`,
  ui: $localize`:@@uiDev-catalogTexts-category-ui:UI-Elemente`,
};

export const CATALOG_ENTRY_NAMES: Readonly<Record<CatalogEntryId, string>> = {
  'unit-sprite': $localize`:@@uiDev-catalogTexts-entry-unitSprite:Einheiten-Sprites`,
  'eater-designs': $localize`:@@uiDev-catalogTexts-entry-eaterDesigns:Fressling-Entwürfe`,
  'unit-icon': $localize`:@@uiDev-catalogTexts-entry-unitIcon:Einheiten-Icons`,
  'sparkle-sprite': $localize`:@@uiDev-catalogTexts-entry-sparkleSprite:Funkeln`,
  'swarm-canvas': $localize`:@@uiDev-catalogTexts-entry-swarmCanvas:Schwarm gesamt an der Stelle`,
  'map-swarm': $localize`:@@uiDev-catalogTexts-entry-mapSwarm:Mini-Schwarm der Karte`,
  'scene-site': $localize`:@@uiDev-catalogTexts-entry-sceneSite:Futterstelle in der Szene`,
  'map-site': $localize`:@@uiDev-catalogTexts-entry-mapSite:Stelle auf der Karte`,
  'map-current-site': $localize`:@@uiDev-catalogTexts-entry-mapCurrentSite:Aktuelle Stelle auf der Karte`,
  'map-site-icon': $localize`:@@uiDev-catalogTexts-entry-mapSiteIcon:Stellen-Icons`,
  'map-find': $localize`:@@uiDev-catalogTexts-entry-mapFind:Fundstück auf der Karte`,
  'far-mood': $localize`:@@uiDev-catalogTexts-entry-farMood:Ferne`,
  'zone-haze': $localize`:@@uiDev-catalogTexts-entry-zoneHaze:Dunst der Zone`,
  'scene-backdrop': $localize`:@@uiDev-catalogTexts-entry-sceneBackdrop:Hintergrund der Szene`,
  'map-water': $localize`:@@uiDev-catalogTexts-entry-mapWater:Wasser der Karte`,
  'backdrop-stack': $localize`:@@uiDev-catalogTexts-entry-backdropStack:Ebenenstapel`,
  'swarm-travel': $localize`:@@uiDev-catalogTexts-entry-swarmTravel:Schwarm auf Reise mit Drift`,
  'neuron-backdrop': $localize`:@@uiDev-catalogTexts-entry-neuronBackdrop:Hintergrund des Neurons`,
  'neuron-soma': $localize`:@@uiDev-catalogTexts-entry-neuronSoma:Zellkörper`,
  'upgrade-node': $localize`:@@uiDev-catalogTexts-entry-upgradeNode:Ausbau-Knoten`,
  'chain-node': $localize`:@@uiDev-catalogTexts-entry-chainNode:Ketten-Knoten`,
  'swarm-neuron': $localize`:@@uiDev-catalogTexts-entry-swarmNeuron:Schwarm-Neuron`,
  'chain-neuron': $localize`:@@uiDev-catalogTexts-entry-chainNeuron:Ketten-Neuron`,
  'neuron-pair': $localize`:@@uiDev-catalogTexts-entry-neuronPair:Beide Neuronen`,
  button: $localize`:@@uiDev-catalogTexts-entry-button:Knopf`,
  tag: $localize`:@@uiDev-catalogTexts-entry-tag:Tag`,
  segment: $localize`:@@uiDev-catalogTexts-entry-segment:Segment`,
  pill: $localize`:@@uiDev-catalogTexts-entry-pill:Pill`,
  'bottom-sheet': $localize`:@@uiDev-catalogTexts-entry-bottomSheet:Bottom-Sheet`,
  toast: $localize`:@@uiDev-catalogTexts-entry-toast:Toast`,
  'dialog-frame': $localize`:@@uiDev-catalogTexts-entry-dialogFrame:Dialog`,
  pipes: $localize`:@@uiDev-catalogTexts-entry-pipes:Pipes`,
};

export const CATALOG_CONTROL_NAMES: Readonly<Record<CatalogControlId, string>> = {
  level: $localize`:@@uiDev-catalogTexts-control-level:Anzahl`,
  site: $localize`:@@uiDev-catalogTexts-control-site:Stellentyp`,
  backdrop: $localize`:@@uiDev-catalogTexts-control-backdrop:Art`,
  zone: $localize`:@@uiDev-catalogTexts-control-zone:Zone`,
  mood: $localize`:@@uiDev-catalogTexts-control-mood:Stimmung`,
  direction: $localize`:@@uiDev-catalogTexts-control-direction:Richtung`,
  shape: $localize`:@@uiDev-catalogTexts-control-shape:Form`,
  fill: $localize`:@@uiDev-catalogTexts-control-fill:Füllstand`,
  mapZone: $localize`:@@uiDev-catalogTexts-control-mapZone:Zone der Karte`,
  siteHighlight: $localize`:@@uiDev-catalogTexts-control-siteHighlight:Hervorhebung`,
  findHighlight: $localize`:@@uiDev-catalogTexts-control-findHighlight:Hervorhebung`,
  dead: $localize`:@@uiDev-catalogTexts-control-dead:Ausgetrocknet`,
  here: $localize`:@@uiDev-catalogTexts-control-here:Schwarm hier`,
  chainUnit: $localize`:@@uiDev-catalogTexts-control-chainUnit:Stufe`,
  upgradeState: $localize`:@@uiDev-catalogTexts-control-upgradeState:Zustand`,
  chainState: $localize`:@@uiDev-catalogTexts-control-chainState:Zustand`,
  rank: $localize`:@@uiDev-catalogTexts-control-rank:Rang`,
  tone: $localize`:@@uiDev-catalogTexts-control-tone:Ton`,
  showChain: $localize`:@@uiDev-catalogTexts-control-showChain:Kette sichtbar`,
  motion: $localize`:@@uiDev-catalogTexts-control-motion:Bewegung`,
  blur: $localize`:@@uiDev-catalogTexts-control-blur:Weichzeichner`,
};

const on = $localize`:@@uiDev-catalogTexts-option-on:an`;
const off = $localize`:@@uiDev-catalogTexts-option-off:aus`;
const toggle = { on, off };
const affordable = $localize`:@@uiDev-catalogTexts-option-affordable:bezahlbar`;
const poor = $localize`:@@uiDev-catalogTexts-option-poor:zu teuer`;
const selected = $localize`:@@uiDev-catalogTexts-option-selected:gewählt`;
const none = $localize`:@@uiDev-catalogTexts-option-none:keine`;
const target = $localize`:@@uiDev-catalogTexts-option-target:Ziel`;

const plainLabels = (id: CatalogChoiceControlId): Record<string, string> =>
  Object.fromEntries(CATALOG_CHOICE_OPTIONS[id].map((option) => [option, option]));

const zoneLabels = Object.fromEntries(ZONE_IDS.map((zone, i) => [`${i}`, ZONE_NAMES[zone]]));

export const CATALOG_OPTION_NAMES: Readonly<
  Record<CatalogChoiceControlId, Readonly<Record<string, string>>>
> = {
  site: SITE_TYPE_NAMES,
  backdrop: {
    ...SITE_TYPE_NAMES,
    travel: $localize`:@@uiDev-catalogTexts-option-travel:Reise`,
    none: $localize`:@@uiDev-catalogTexts-option-noSite:ohne Stelle`,
  },
  zone: zoneLabels,
  mood: {
    ...zoneLabels,
    [`${ZONE_IDS.length}`]: $localize`:@@uiDev-catalogTexts-option-beyond:dahinter`,
  },
  direction: {
    '-90': $localize`:@@uiDev-catalogTexts-option-up:nach oben`,
    '0': $localize`:@@uiDev-catalogTexts-option-right:nach rechts`,
    '90': $localize`:@@uiDev-catalogTexts-option-down:nach unten`,
    '180': $localize`:@@uiDev-catalogTexts-option-left:nach links`,
  },
  shape: Object.fromEntries(
    CATALOG_CHOICE_OPTIONS.shape.map((seed, i) => [
      seed,
      $localize`:@@uiDev-catalogTexts-option-shape:Form ${formatNumber(i + 1)}:index:`,
    ]),
  ),
  fill: Object.fromEntries(
    CATALOG_CHOICE_OPTIONS.fill.map((percent) => [
      percent,
      $localize`:@@uiDev-catalogTexts-option-percent:${formatNumber(Number(percent))}:value: %`,
    ]),
  ),
  mapZone: {
    current: $localize`:@@uiDev-catalogTexts-option-current:aktuell`,
    next: $localize`:@@uiDev-catalogTexts-option-next:nächste`,
  },
  siteHighlight: {
    none,
    target,
    auto: $localize`:@@uiDev-catalogTexts-option-auto:automatisch`,
  },
  findHighlight: { none, target },
  dead: toggle,
  here: toggle,
  chainUnit: {
    eater: UNIT_TEXTS.eater.name,
    brooder: UNIT_TEXTS.brooder.name,
    eggBearer: UNIT_TEXTS.eggBearer.name,
    clutch: UNIT_TEXTS.clutch.name,
  },
  upgradeState: { affordable, poor, selected },
  chainState: {
    affordable,
    poor,
    selected,
    locked: $localize`:@@uiDev-catalogTexts-option-locked:gesperrt`,
  },
  rank: plainLabels('rank'),
  tone: {
    pink: $localize`:@@uiDev-catalogTexts-option-pink:Pink (Schwarm)`,
    orange: $localize`:@@uiDev-catalogTexts-option-orange:Orange (Kette)`,
  },
  showChain: toggle,
  motion: toggle,
  blur: toggle,
};

export const EATER_DESIGN_NAMES: Readonly<Record<EaterDesignId, string>> = {
  amoeba: $localize`:@@uiDev-catalogTexts-eaterDesign-amoeba:Amöbe`,
};
