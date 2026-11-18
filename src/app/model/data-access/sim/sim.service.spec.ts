import { TestBed } from '@angular/core/testing';

import type { SimConfig } from '../../domain/models/sim.model';
import type { ReducedRun } from '../../domain/reduce-result-logic';
import type { SimRequest, SimResponse } from './sim-service.model';
import { SIM_WORKER_FACTORY, SimWorker } from './sim-service.tokens';
import { SimService } from './sim.service';

const CONFIG: SimConfig = { seed: 's', durationMs: 1000, bots: [{ kind: 'idle' }], params: {} };
const RUN = { bot: 'idle' } as ReducedRun;

class FakeWorker implements SimWorker {
  onmessage: SimWorker['onmessage'] = null;
  onerror: SimWorker['onerror'] = null;
  onmessageerror: SimWorker['onmessageerror'] = null;
  readonly posted: SimRequest[] = [];
  terminated = false;

  postMessage(request: SimRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  send(data: SimResponse): void {
    this.onmessage?.call(this as unknown as Worker, new MessageEvent('message', { data }));
  }
}

describe('SimService', () => {
  let workers: FakeWorker[];
  let client: SimService;

  beforeEach(() => {
    workers = [];
    TestBed.configureTestingModule({
      providers: [
        SimService,
        {
          provide: SIM_WORKER_FACTORY,
          useValue: () => {
            const worker = new FakeWorker();
            workers.push(worker);
            return worker;
          },
        },
      ],
    });
    client = TestBed.inject(SimService);
  });

  it('übernimmt die Ergebnisse erst mit dem Ende des Laufs', () => {
    client.start(CONFIG);
    const [worker] = workers;
    const runId = worker.posted[0].runId;
    expect(client.running()).toBe(true);

    worker.send({ type: 'result', runId, run: RUN });
    expect(client.finishedBots()).toBe(1);
    expect(client.runs()).toEqual([]);

    worker.send({ type: 'done', runId });
    expect(client.runs()).toEqual([RUN]);
    expect(client.running()).toBe(false);
  });

  it('verwendet einen freien Worker weiter', () => {
    client.start(CONFIG);
    workers[0].send({ type: 'done', runId: workers[0].posted[0].runId });
    client.start(CONFIG);
    expect(workers).toHaveLength(1);
    expect(workers[0].terminated).toBe(false);
  });

  it('bricht einen laufenden Lauf ab und ignoriert seine Nachrichten', () => {
    client.start(CONFIG);
    const [first] = workers;
    client.start(CONFIG);
    expect(first.terminated).toBe(true);
    expect(workers).toHaveLength(2);

    first.send({ type: 'done', runId: first.posted[0].runId });
    expect(client.running()).toBe(true);
  });

  it('zeigt gemeldete Fehler und behält den letzten Lauf', () => {
    client.start(CONFIG);
    workers[0].send({ type: 'result', runId: 1, run: RUN });
    workers[0].send({ type: 'done', runId: 1 });
    client.start(CONFIG);
    workers[0].send({ type: 'error', runId: 2, message: 'kaputt' });

    expect(client.error()).toEqual({ code: 'run-failed', detail: 'kaputt' });
    expect(client.running()).toBe(false);
    expect(client.runs()).toEqual([RUN]);
    expect(workers[0].terminated).toBe(true);
  });

  it('fängt Abstürze des Workers ab', () => {
    client.start(CONFIG);
    const event = new ErrorEvent('error', { message: '', cancelable: true });
    workers[0].onerror?.call(workers[0] as unknown as Worker, event);
    expect(client.error()).toEqual({ code: 'worker-crashed', detail: null });
    expect(event.defaultPrevented).toBe(true);

    client.start(CONFIG);
    workers[1].onmessageerror?.call(
      workers[1] as unknown as Worker,
      new MessageEvent('messageerror'),
    );
    expect(client.error()).toEqual({ code: 'worker-unreadable', detail: null });
  });

  it('meldet einen Worker, der nicht startet', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SimService,
        {
          provide: SIM_WORKER_FACTORY,
          useValue: () => {
            throw new Error('kein Worker');
          },
        },
      ],
    });
    const failing = TestBed.inject(SimService);
    failing.start(CONFIG);
    expect(failing.error()).toEqual({ code: 'run-failed', detail: 'kein Worker' });
  });

  it('beendet den Worker beim Zerstören', () => {
    client.start(CONFIG);
    TestBed.resetTestingModule();
    expect(workers[0].terminated).toBe(true);
  });

  it('bricht beim Stoppen ab und behält den letzten Lauf', () => {
    client.start(CONFIG);
    workers[0].send({ type: 'result', runId: 1, run: RUN });
    workers[0].send({ type: 'done', runId: 1 });
    client.start(CONFIG);
    client.stop();

    expect(workers[0].terminated).toBe(true);
    expect(client.running()).toBe(false);
    expect(client.error()).toBeNull();
    expect(client.runs()).toEqual([RUN]);
  });
});
