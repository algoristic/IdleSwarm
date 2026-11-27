import { TestBed } from '@angular/core/testing';

import { catchUp } from '../../domain/catch-up-logic';
import { newGame } from '../../domain/new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import {
  CatchUpRequest,
  CatchUpResult,
  CatchUpWorker,
  CatchUpWorkerFactory,
} from './catch-up-service.model';
import { provideCatchUpService } from './catch-up-service.providers';
import { CATCH_UP_WORKER_FACTORY } from './catch-up-service.tokens';
import { CatchUpService } from './catch-up.service';

class FakeWorker implements CatchUpWorker {
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: ((event: MessageEvent<unknown>) => void) | null = null;
  requests: CatchUpRequest[] = [];
  terminated = false;

  postMessage(message: CatchUpRequest): void {
    this.requests.push(structuredClone(message));
  }

  terminate(): void {
    this.terminated = true;
  }

  respond(): void {
    const { config, state, seconds } = this.requests[0];
    const summary = catchUp(config, state, seconds, (done, total) =>
      this.emit({ type: 'progress', done, total }),
    );
    this.emit({ type: 'done', state, summary });
  }

  emit(data: unknown): void {
    this.onmessage?.(new MessageEvent('message', { data }));
  }

  fail(): void {
    this.onerror?.(new ErrorEvent('error'));
  }
}

const config = PROTOTYPE_GAME_CONFIG;

function createService(factory: CatchUpWorkerFactory): CatchUpService {
  TestBed.configureTestingModule({
    providers: [provideCatchUpService(), { provide: CATCH_UP_WORKER_FACTORY, useValue: factory }],
  });
  return TestBed.inject(CatchUpService);
}

function expectedAfter(seconds: number): CatchUpResult {
  const state = newGame(config, 13, 1_000_000);
  const summary = catchUp(config, state, seconds);
  return { state, summary };
}

describe('CatchUpService', () => {
  it('catches up in the worker, returns the result and terminates the worker', async () => {
    const worker = new FakeWorker();
    const service = createService(() => worker);
    const state = newGame(config, 13, 1_000_000);

    const result = service.run(config, state, 10);
    expect(worker.requests).toEqual([{ type: 'catchUp', config, state, seconds: 10 }]);
    worker.respond();

    expect(await result).toEqual(expectedAfter(10));
    expect(state).toEqual(newGame(config, 13, 1_000_000));
    expect(worker.terminated).toBe(true);
    expect(service.progress()).toBeNull();
  });

  it('reports progress only for more than 20000 steps', async () => {
    const worker = new FakeWorker();
    const service = createService(() => worker);
    const state = newGame(config, 13, 1_000_000);

    const long = service.run(config, state, 10_000);
    worker.emit({ type: 'progress', done: 20000, total: 40000 });
    expect(service.progress()).toEqual({ done: 20000, total: 40000 });
    worker.emit({ type: 'done', state, summary: null });
    await long;
    expect(service.progress()).toBeNull();

    const short = service.run(config, state, 10);
    worker.emit({ type: 'progress', done: 40, total: 40 });
    expect(service.progress()).toBeNull();
    worker.emit({ type: 'done', state, summary: null });
    await short;
  });

  it('catches up on a copy in the main thread without a worker', async () => {
    const service = createService(() => null);
    const state = newGame(config, 13, 1_000_000);

    expect(await service.run(config, state, 10)).toEqual(expectedAfter(10));
    expect(state).toEqual(newGame(config, 13, 1_000_000));
  });

  it('falls back to the main thread on a worker error', async () => {
    const worker = new FakeWorker();
    const service = createService(() => worker);

    const result = service.run(config, newGame(config, 13, 1_000_000), 10);
    worker.fail();

    expect(await result).toEqual(expectedAfter(10));
    expect(worker.terminated).toBe(true);
  });

  it('falls back to the main thread on an invalid response', async () => {
    const worker = new FakeWorker();
    const service = createService(() => worker);

    const result = service.run(config, newGame(config, 13, 1_000_000), 10);
    worker.emit({ type: 'unbekannt' });

    expect(await result).toEqual(expectedAfter(10));
  });

  it('terminates the worker and returns null when cancelled or destroyed', async () => {
    const worker = new FakeWorker();
    const service = createService(() => worker);

    const cancelled = service.run(config, newGame(config, 13, 1_000_000), 10);
    service.cancel();
    expect(await cancelled).toBeNull();
    expect(worker.terminated).toBe(true);

    worker.terminated = false;
    const destroyed = service.run(config, newGame(config, 13, 1_000_000), 10);
    TestBed.resetTestingModule();
    expect(await destroyed).toBeNull();
    expect(worker.terminated).toBe(true);
  });
});
