export const ZONE_IDS = ['droplet', 'tidePool', 'rockPool', 'shallows'] as const;
export type ZoneId = (typeof ZONE_IDS)[number];

export interface NextZone {
  zone: number;
  threshold: number;
  open: boolean;
}
