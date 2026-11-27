import { FindId } from '../../domain/models/find.model';
import { SiteTypeId } from '../../domain/models/site.model';

export type TargetName =
  { kind: 'site'; siteType: SiteTypeId } | { kind: 'find'; findType: FindId };

export type SiteNote =
  | { kind: 'dried' }
  | { kind: 'average'; rate: number }
  | { kind: 'emptyIn'; seconds: number }
  | { kind: 'noHarvest' };

export type SwarmPlace =
  | { kind: 'travelling'; destination: TargetName | null; remaining: number; progress: number }
  | { kind: 'site'; siteType: SiteTypeId; fill: number; note: SiteNote }
  | { kind: 'none' };

export type SwarmTag =
  | { kind: 'mark'; target: TargetName }
  | { kind: 'alternative'; siteType: SiteTypeId }
  | { kind: 'none' };

export interface SwarmContextView {
  place: SwarmPlace;
  tag: SwarmTag;
}
