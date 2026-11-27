import { FindId } from './find.model';

export interface CatchUpSummary {
  seconds: number;
  simulatedSeconds: number;
  capped: boolean;
  steps: number;
  harvested: number;
  food: number;
  arrivals: number;
  zones: number[];
  driedSites: number;
  idleTime: number;
  finds: FindId[];
  eatersBefore: number;
  eatersAfter: number;
}

export type CatchUpProgressHandler = (done: number, total: number) => void;
