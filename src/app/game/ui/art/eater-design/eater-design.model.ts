export const EATER_DESIGN_IDS = [
  'bacillus',
  'dinoflagellate',
  'heliozoan',
  'diatom',
  'stentor',
  'spiral',
  'prism',
] as const;
export type EaterDesignId = (typeof EATER_DESIGN_IDS)[number];

export interface Placed {
  transform: string;
  r: number;
}

export interface Cycling extends Placed {
  key: number;
  delay: number;
}

export interface Ray {
  key: number;
  transform: string;
  length: number;
  values: string;
  dur: string;
  delay: number;
  granule: boolean;
  granuleValues: string;
  granuleRest: number;
  granuleDur: string;
}
