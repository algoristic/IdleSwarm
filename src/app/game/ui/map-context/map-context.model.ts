import { ZoneId } from '../../domain/models/zone.model';

export interface MapContextView {
  zone: number;
  zoneId: ZoneId;
  speed: number;
}
