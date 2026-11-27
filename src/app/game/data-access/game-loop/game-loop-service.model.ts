export interface FrameScheduler {
  request(callback: (now: number) => void): number;
  cancel(handle: number): void;
}

export interface PageVisibility {
  isHidden(): boolean;
  onVisibilityChange(listener: () => void): () => void;
  onPageHide(listener: () => void): () => void;
}
