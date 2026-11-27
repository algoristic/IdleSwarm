export const TARGET_KINDS = ['site', 'find'] as const;
export type TargetKind = (typeof TARGET_KINDS)[number];

export interface Travel {
  kind: TargetKind;
  targetId: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  distance: number;
  covered: number;
}
