import { SiteTypeId } from '../../domain/models/site.model';

export const REACH_PX = 252;

export const MAP_SITE_ICON_RADIUS: Readonly<Record<SiteTypeId, number>> = {
  algae: 15,
  plankton: 15,
  carcass: 14,
  marineSnow: 14,
  seagrass: 30,
};

export const MAP_ZONES = ['current', 'next'] as const;
export type MapZone = (typeof MAP_ZONES)[number];
