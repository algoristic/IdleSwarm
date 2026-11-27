import { formatNumber } from '@app/shared/util/format';

import { FindId } from '../../domain/models/find.model';
import { GameConfig } from '../../domain/models/game-config.model';
import { SiteTypeId } from '../../domain/models/site.model';
import { UnitId } from '../../domain/models/unit.model';
import { UpgradeId } from '../../domain/models/upgrade.model';
import { ZoneId } from '../../domain/models/zone.model';
import { FindDescriptions, UnitTexts } from './game-texts.model';

export const UNIT_TEXTS: Readonly<Record<UnitId, UnitTexts>> = {
  eater: {
    name: $localize`:@@uiGame-gameTexts-unit-eater-name:Fressling`,
    plural: $localize`:@@uiGame-gameTexts-unit-eater-plural:Fresslinge`,
    dative: $localize`:@@uiGame-gameTexts-unit-eater-dative:Fresslingen`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-eater-abbreviation:F.`,
  },
  brooder: {
    name: $localize`:@@uiGame-gameTexts-unit-brooder-name:Brutling`,
    plural: $localize`:@@uiGame-gameTexts-unit-brooder-plural:Brutlinge`,
    dative: $localize`:@@uiGame-gameTexts-unit-brooder-dative:Brutlingen`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-brooder-abbreviation:B.`,
  },
  eggBearer: {
    name: $localize`:@@uiGame-gameTexts-unit-eggBearer-name:Eiträgerin`,
    plural: $localize`:@@uiGame-gameTexts-unit-eggBearer-plural:Eiträgerinnen`,
    dative: $localize`:@@uiGame-gameTexts-unit-eggBearer-dative:Eiträgerinnen`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-eggBearer-abbreviation:Et.`,
  },
  clutch: {
    name: $localize`:@@uiGame-gameTexts-unit-clutch-name:Gelege`,
    plural: $localize`:@@uiGame-gameTexts-unit-clutch-plural:Gelege`,
    dative: $localize`:@@uiGame-gameTexts-unit-clutch-dative:Gelegen`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-clutch-abbreviation:G.`,
  },
  broodClump: {
    name: $localize`:@@uiGame-gameTexts-unit-broodClump-name:Brutklumpen`,
    plural: $localize`:@@uiGame-gameTexts-unit-broodClump-plural:Brutklumpen`,
    dative: $localize`:@@uiGame-gameTexts-unit-broodClump-dative:Brutklumpen`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-broodClump-abbreviation:Bk.`,
  },
  primalNest: {
    name: $localize`:@@uiGame-gameTexts-unit-primalNest-name:Urnest`,
    plural: $localize`:@@uiGame-gameTexts-unit-primalNest-plural:Urnester`,
    dative: $localize`:@@uiGame-gameTexts-unit-primalNest-dative:Urnestern`,
    abbreviation: $localize`:@@uiGame-gameTexts-unit-primalNest-abbreviation:U.`,
  },
};

export const UPGRADE_NAMES: Readonly<Record<UpgradeId, string>> = {
  hearth: $localize`:@@uiGame-gameTexts-upgrade-hearth:Brutherd`,
  digestion: $localize`:@@uiGame-gameTexts-upgrade-digestion:Verdauung`,
  flagella: $localize`:@@uiGame-gameTexts-upgrade-flagella:Geißeln`,
  crop: $localize`:@@uiGame-gameTexts-upgrade-crop:Kropf`,
};

export const SITE_TYPE_NAMES: Readonly<Record<SiteTypeId, string>> = {
  algae: $localize`:@@uiGame-gameTexts-siteType-algae:Algenfilm`,
  plankton: $localize`:@@uiGame-gameTexts-siteType-plankton:Planktonwolke`,
  carcass: $localize`:@@uiGame-gameTexts-siteType-carcass:Toter Krebs`,
  marineSnow: $localize`:@@uiGame-gameTexts-siteType-marineSnow:Meeresschnee`,
  seagrass: $localize`:@@uiGame-gameTexts-siteType-seagrass:Seegraswiese`,
};

export const ZONE_NAMES: Readonly<Record<ZoneId, string>> = {
  droplet: $localize`:@@uiGame-gameTexts-zone-droplet:Wassertropfen`,
  tidePool: $localize`:@@uiGame-gameTexts-zone-tidePool:Gezeitentümpel`,
  rockPool: $localize`:@@uiGame-gameTexts-zone-rockPool:Felsenbecken`,
  shallows: $localize`:@@uiGame-gameTexts-zone-shallows:Flachwasser`,
};

export const FIND_NAMES: Readonly<Record<FindId, string>> = {
  feedingFrenzy: $localize`:@@uiGame-gameTexts-find-feedingFrenzy-name:Fressrausch`,
  layingBoost: $localize`:@@uiGame-gameTexts-find-layingBoost-name:Legeschub`,
  breedingFrenzy: $localize`:@@uiGame-gameTexts-find-breedingFrenzy-name:Vermehrungsrausch`,
  tailwind: $localize`:@@uiGame-gameTexts-find-tailwind-name:Rückenwind`,
  foodBubble: $localize`:@@uiGame-gameTexts-find-foodBubble-name:Nahrungsblase`,
  eggBall: $localize`:@@uiGame-gameTexts-find-eggBall-name:Eierballen`,
  growthSpurt: $localize`:@@uiGame-gameTexts-find-growthSpurt-name:Wachstumsschub`,
  germCell: $localize`:@@uiGame-gameTexts-find-germCell-name:Keimzelle`,
};

export const FIND_DESCRIPTIONS: FindDescriptions = {
  feedingFrenzy: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-feedingFrenzy-description:Appetit ×${formatNumber(finds.multipliers.feedingFrenzy)}:multiplier: für ${formatNumber(finds.buffDuration)}:duration: s`,
  layingBoost: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-layingBoost-description:Eier-Rate ×${formatNumber(finds.multipliers.layingBoost)}:multiplier: für ${formatNumber(finds.buffDuration)}:duration: s`,
  breedingFrenzy: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-breedingFrenzy-description:Erzeugung der Kette ×${formatNumber(finds.multipliers.breedingFrenzy)}:multiplier: für ${formatNumber(finds.buffDuration)}:duration: s`,
  tailwind: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-tailwind-description:Reisetempo ×${formatNumber(finds.multipliers.tailwind)}:multiplier: für ${formatNumber(finds.buffDuration)}:duration: s`,
  foodBubble: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-foodBubble-description:Sofort Vorrat: ${formatNumber(finds.foodBubbleSeconds)}:duration: s Ø-Ernte`,
  eggBall: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-eggBall-description:Sofort Eier: ${formatNumber(finds.eggBallSeconds)}:duration: s Eier-Rate`,
  growthSpurt: ({ finds }: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-growthSpurt-description:Sofort ${formatNumber(finds.growthSpurtSeconds)}:duration: s Erzeugung je Stufe`,
  germCell: (_config: GameConfig): string =>
    $localize`:@@uiGame-gameTexts-find-germCell-description:Nächster Rang eines Schwarm-Ausbaus gratis`,
};
