export const MAP_SITE_HIGHLIGHTS = ['none', 'target', 'auto'] as const;
export type MapSiteHighlight = (typeof MAP_SITE_HIGHLIGHTS)[number];

export interface MapSiteRing {
  radius: number;
  color: string;
  width: number;
  dash: string;
}
