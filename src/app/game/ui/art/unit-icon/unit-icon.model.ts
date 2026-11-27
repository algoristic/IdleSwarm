export const UNIT_ICON_VARIANTS = ['list', 'tab'] as const;
export type UnitIconVariant = (typeof UNIT_ICON_VARIANTS)[number];

export interface UnitIconFrame {
  width: number;
  height: number;
  viewBox: string;
  transform: string | null;
}
