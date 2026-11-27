export const UNIT_IDS = [
  'eater',
  'brooder',
  'eggBearer',
  'clutch',
  'broodClump',
  'primalNest',
] as const;
export type UnitId = (typeof UNIT_IDS)[number];
