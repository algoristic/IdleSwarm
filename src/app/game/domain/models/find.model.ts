export const FIND_IDS = [
  'feedingFrenzy',
  'layingBoost',
  'breedingFrenzy',
  'tailwind',
  'foodBubble',
  'eggBall',
  'growthSpurt',
  'germCell',
] as const;
export type FindId = (typeof FIND_IDS)[number];

export const BUFF_IDS = [
  'feedingFrenzy',
  'layingBoost',
  'breedingFrenzy',
  'tailwind',
] as const satisfies readonly FindId[];
export type BuffId = (typeof BUFF_IDS)[number];

export interface Find {
  id: number;
  type: FindId;
  zone: number;
  x: number;
  y: number;
}
