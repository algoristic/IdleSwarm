export const UNIT_IDS = [
  'eater',
  'brooder',
  'eggBearer',
  'clutch',
  'broodClump',
  'primalNest',
] as const;
export type UnitId = (typeof UNIT_IDS)[number];

export const BUY_MODES = ['one', 'quarter', 'max'] as const;
export type BuyMode = (typeof BUY_MODES)[number];
