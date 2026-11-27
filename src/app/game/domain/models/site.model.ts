export const SITE_TYPE_IDS = ['algae', 'plankton', 'carcass', 'marineSnow', 'seagrass'] as const;
export type SiteTypeId = (typeof SITE_TYPE_IDS)[number];

export interface Site {
  id: number;
  type: SiteTypeId;
  zone: number;
  x: number;
  y: number;
  size: number;
  stock: number;
  bornAt: number;
  dead: boolean;
  removeAt: number | null;
  discovered: boolean;
  shape: number;
}
