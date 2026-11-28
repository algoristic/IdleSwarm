import { UnitId } from '../../../domain/models/unit.model';
import { CHAIN_ICON_SCALE, ChainIconUnit } from '../unit-sprite/unit-sprite.model';
import { UnitIconFrame, UnitIconVariant } from './unit-icon.model';

const LIST_VIEW_BOXES: Readonly<Record<UnitId, string>> = {
  eater: '-12.5 -8 25 16',
  brooder: '-35 -35 70 70',
  eggBearer: '-23 -18 46 36',
  clutch: '-28 -28 56 56',
  broodClump: '-37 -37 74 74',
  primalNest: '-49 -49 98 98',
};

const TAB_SCALE_FACTOR = 1.45;

export const LOCKED_UNIT_ICON_FRAME: UnitIconFrame = {
  width: 24,
  height: 24,
  viewBox: '-12 -12 24 24',
  transform: null,
};

const isChainIconUnit = (unit: UnitId): unit is ChainIconUnit => unit in CHAIN_ICON_SCALE;

export function unitIconFrame(unit: UnitId, variant: UnitIconVariant): UnitIconFrame {
  if (variant === 'tab' && isChainIconUnit(unit)) {
    const scale = (CHAIN_ICON_SCALE[unit] * TAB_SCALE_FACTOR).toFixed(2);
    return { width: 16, height: 16, viewBox: '-20 -20 40 40', transform: `scale(${scale})` };
  }
  return {
    width: 34,
    height: unit === 'eater' ? 22 : 34,
    viewBox: LIST_VIEW_BOXES[unit],
    transform: null,
  };
}
