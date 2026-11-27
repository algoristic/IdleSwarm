import { FindId } from '../../domain/models/find.model';
import { ZoneId } from '../../domain/models/zone.model';

export type GameToastMessage =
  | { kind: 'welcome' }
  | { kind: 'saveReset' }
  | { kind: 'findCollected'; findType: FindId }
  | { kind: 'zoneChanged'; from: ZoneId; to: ZoneId }
  | { kind: 'travelAborted' }
  | { kind: 'unmarked' }
  | { kind: 'noTarget' };

export interface GameToast {
  id: number;
  message: GameToastMessage;
}
