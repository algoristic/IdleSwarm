import { CatchUpSummary } from '../../domain/models/catch-up.model';
import { GameConfig } from '../../domain/models/game-config.model';
import { GameState } from '../../domain/models/game-state.model';

export interface CatchUpRequest {
  type: 'catchUp';
  config: GameConfig;
  state: GameState;
  seconds: number;
}

export interface CatchUpProgress {
  done: number;
  total: number;
}

export interface CatchUpProgressMessage extends CatchUpProgress {
  type: 'progress';
}

export interface CatchUpResult {
  state: GameState;
  summary: CatchUpSummary | null;
}

export interface CatchUpDoneMessage extends CatchUpResult {
  type: 'done';
}

export type CatchUpResponse = CatchUpProgressMessage | CatchUpDoneMessage;

export interface CatchUpWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null;
  postMessage(message: CatchUpRequest): void;
  terminate(): void;
}

export type CatchUpWorkerFactory = () => CatchUpWorker | null;
