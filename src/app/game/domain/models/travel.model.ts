import { Find } from './find.model';
import { Site } from './site.model';

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

export type TravelTarget = { kind: 'site'; site: Site } | { kind: 'find'; find: Find };

export interface TravelRate {
  travelTime: number;
  available: number;
  average: number;
}

export interface SiteAlternative extends TravelRate {
  site: Site;
}

export const MARK_RESULTS = [
  'unmarked',
  'marked',
  'markedDriesBeforeArrival',
  'notFound',
  'currentSite',
  'dried',
  'unreachable',
] as const;
export type MarkResult = (typeof MARK_RESULTS)[number];
