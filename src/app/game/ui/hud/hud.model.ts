export type HarvestNote =
  { kind: 'travelling' } | { kind: 'throttled'; percent: number } | { kind: 'perSecond' };

export interface HudView {
  food: number;
  capacity: number;
  foodFill: number;
  foodOver: boolean;
  eggs: number;
  eggRate: number;
  harvestRate: number;
  harvestNote: HarvestNote;
}
