import { FindId } from './find.model';
import { SiteTypeId } from './site.model';
import { TargetKind } from './travel.model';

export interface SiteDriedEvent {
  type: 'siteDried';
  siteId: number;
  siteType: SiteTypeId;
}

export interface ZoneChangedEvent {
  type: 'zoneChanged';
  from: number;
  to: number;
}

export interface DepartedEvent {
  type: 'departed';
  kind: TargetKind;
  targetId: number;
}

export interface TravelAbortedEvent {
  type: 'travelAborted';
}

export interface ArrivedEvent {
  type: 'arrived';
  siteId: number;
}

export interface FindCollectedEvent {
  type: 'findCollected';
  findId: number;
  findType: FindId;
}

export interface UnmarkedEvent {
  type: 'unmarked';
}

export interface NoTargetEvent {
  type: 'noTarget';
}

export interface EndedEvent {
  type: 'ended';
}

export type GameEvent =
  | SiteDriedEvent
  | ZoneChangedEvent
  | DepartedEvent
  | TravelAbortedEvent
  | ArrivedEvent
  | FindCollectedEvent
  | UnmarkedEvent
  | NoTargetEvent
  | EndedEvent;

export type GameEventHandler = (event: GameEvent) => void;
