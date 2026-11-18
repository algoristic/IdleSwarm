import { TestBed } from '@angular/core/testing';

import { MODEL_TEXTS } from '../model-texts.de';
import type { ReducedRun } from './reduce-result';
import { SIM_WORKER_FACTORY, SimClient, SimWorker } from './sim-client';
import type { SimConfig, SimRequest, SimResponse } from './sim-protocol';

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

describe('SimClient', () => {
  let workers: FakeWorker[];
  let client: SimClient;

  beforeEach(() => {
    workers = [];
    TestBed.configureTestingModule({
      providers: [
        SimClient,
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
    client = TestBed.inject(SimClient);
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

    expect(client.error()).toBe('kaputt');
    expect(client.running()).toBe(false);
    expect(client.runs()).toEqual([RUN]);
    expect(workers[0].terminated).toBe(true);
  });

  it('fängt Abstürze des Workers ab', () => {
    client.start(CONFIG);
    const event = new ErrorEvent('error', { message: '', cancelable: true });
    workers[0].onerror?.call(workers[0] as unknown as Worker, event);
    expect(client.error()).toBe(MODEL_TEXTS.workerCrashed);
    expect(event.defaultPrevented).toBe(true);

    client.start(CONFIG);
    workers[1].onmessageerror?.call(
      workers[1] as unknown as Worker,
      new MessageEvent('messageerror'),
    );
    expect(client.error()).toBe(MODEL_TEXTS.workerUnreadable);
  });

  it('meldet einen Worker, der nicht startet', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        SimClient,
        {
          provide: SIM_WORKER_FACTORY,
          useValue: () => {
            throw new Error('kein Worker');
          },
        },
      ],
    });
    const failing = TestBed.inject(SimClient);
    failing.start(CONFIG);
    expect(failing.error()).toBe('kein Worker');
  });

  it('beendet den Worker beim Zerstören', () => {
    client.start(CONFIG);
    TestBed.resetTestingModule();
    expect(workers[0].terminated).toBe(true);
  });
});
