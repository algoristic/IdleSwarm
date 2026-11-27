import { GameEvent } from '../../domain/models/game-event.model';

export interface GameEventEntry {
  id: number;
  event: GameEvent;
}
