export const PILL_TONES = ['lime', 'yellow', 'orange'] as const;
export type PillTone = (typeof PILL_TONES)[number];
