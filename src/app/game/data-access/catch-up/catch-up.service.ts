import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { catchUp, catchUpSteps, showsCatchUpProgress } from '../../domain/catch-up-logic';
import { CatchUpProgressHandler } from '../../domain/models/catch-up.model';
import { GameConfig } from '../../domain/models/game-config.model';
import { GameState } from '../../domain/models/game-state.model';
import {
  CatchUpProgress,
  CatchUpRequest,
  CatchUpResult,
  CatchUpWorker,
} from './catch-up-service.model';
import { CATCH_UP_WORKER_FACTORY } from './catch-up-service.tokens';
import { isCatchUpResponse } from './catch-up-service.utils';

type WorkerOutcome = CatchUpResult | 'failed' | 'cancelled';

@Injectable()
export class CatchUpService {
  readonly #createWorker = inject(CATCH_UP_WORKER_FACTORY);
  readonly #destroyRef = inject(DestroyRef);

  readonly #progress = signal<CatchUpProgress | null>(null);
  #cancelRunning: (() => void) | null = null;
  #destroyed = false;

  progress = this.#progress.asReadonly();

  constructor() {
    this.#destroyRef.onDestroy(() => {
      this.#destroyed = true;
      this.cancel();
    });
  }

  async run(config: GameConfig, state: GameState, seconds: number): Promise<CatchUpResult | null> {
    this.cancel();
    if (this.#destroyed) return null;
    const onProgress = showsCatchUpProgress(catchUpSteps(config, seconds))
      ? (done: number, total: number): void => this.#progress.set({ done, total })
      : undefined;
    try {
      const outcome = await this.#runInWorker(
        { type: 'catchUp', config, state, seconds },
        onProgress,
      );
      if (outcome === 'cancelled') return null;
      if (outcome !== 'failed') return outcome;
      return this.#runInline(config, state, seconds, onProgress);
    } finally {
      if (!this.#cancelRunning) this.#progress.set(null);
    }
  }

  cancel(): void {
    this.#cancelRunning?.();
  }

  #runInWorker(
    request: CatchUpRequest,
    onProgress: CatchUpProgressHandler | undefined,
  ): Promise<WorkerOutcome> {
    let worker: CatchUpWorker | null;
    try {
      worker = this.#createWorker();
    } catch {
      worker = null;
    }
    if (!worker) return Promise.resolve('failed');
    const running = worker;
    return new Promise<WorkerOutcome>((resolve) => {
      const finish = (outcome: WorkerOutcome): void => {
        if (this.#cancelRunning !== cancel) return;
        this.#cancelRunning = null;
        running.onmessage = running.onerror = running.onmessageerror = null;
        running.terminate();
        resolve(outcome);
      };
      const cancel = (): void => finish('cancelled');
      this.#cancelRunning = cancel;
      running.onmessage = ({ data }): void => {
        if (!isCatchUpResponse(data)) finish('failed');
        else if (data.type === 'progress') onProgress?.(data.done, data.total);
        else finish({ state: data.state, summary: data.summary });
      };
      running.onerror = (): void => finish('failed');
      running.onmessageerror = (): void => finish('failed');
      try {
        running.postMessage(request);
      } catch {
        finish('failed');
      }
    });
  }

  #runInline(
    config: GameConfig,
    state: GameState,
    seconds: number,
    onProgress: CatchUpProgressHandler | undefined,
  ): CatchUpResult {
    const copy = structuredClone(state);
    const summary = catchUp(config, copy, seconds, onProgress);
    return { state: copy, summary };
  }
}
