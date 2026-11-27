export const SEGMENT_SIZES = ['default', 'compact'] as const;
export type SegmentSize = (typeof SEGMENT_SIZES)[number];

export const SEGMENT_TONES = ['default', 'orange', 'pink'] as const;
export type SegmentTone = (typeof SEGMENT_TONES)[number];

export interface SegmentOption<T extends string = string> {
  id: T;
  label: string;
  tone?: SegmentTone;
  testId?: string;
}

export interface SegmentButtonView<T extends string = string> {
  id: T;
  label: string;
  pressed: boolean;
  classes: string;
  testId: string | null;
}
