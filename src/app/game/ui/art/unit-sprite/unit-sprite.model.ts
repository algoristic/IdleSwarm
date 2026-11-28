import { UnitId } from '../../../domain/models/unit.model';

export const UNIT_SPRITE_HALF_EXTENT: Readonly<Record<UnitId, number>> = {
  eater: 12,
  brooder: 35,
  eggBearer: 24,
  clutch: 28,
  broodClump: 37,
  primalNest: 49,
};

export const CHAIN_ICON_SCALE = {
  eater: 1.25,
  brooder: 0.4,
  eggBearer: 0.58,
  clutch: 0.46,
} as const satisfies Partial<Record<UnitId, number>>;
export type ChainIconUnit = keyof typeof CHAIN_ICON_SCALE;

export const SPRITE_DETAILS = ['full', 'reduced'] as const;
export type SpriteDetail = (typeof SPRITE_DETAILS)[number];
