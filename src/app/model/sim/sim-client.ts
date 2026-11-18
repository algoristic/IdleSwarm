import { inject, Injectable, InjectionToken, OnDestroy, signal } from '@angular/core';

import { MODEL_TEXTS } from '../model-texts.de';
import type { ReducedRun } from './reduce-result';
import type { SimConfig, SimRequest, SimResponse } from './sim-protocol';

export type SimWorker = Pick<
  Worker,
  'postMessage' | 'terminate' | 'onmessage' | 'onerror' | 'onmessageerror'
>;

export const SIM_WORKER_FACTORY = new InjectionToken<() => SimWorker>('SIM_WORKER_FACTORY', {
  providedIn: 'root',
  factory: () => () => new Worker(new URL('./sim.worker', import.meta.url), { type: 'module' }),
});

/** Führt Läufe im Worker aus; `runSimulation` ist synchron, Abbrechen heißt also Beenden. */
@Injectable()
export class SimClient implements OnDestroy {
  private readonly createWorker = inject(SIM_WORKER_FACTORY);
  private worker: SimWorker | null = null;
  private runId = 0;
  private pending: ReducedRun[] = [];

  /** Letzter vollständiger Lauf; bleibt stehen, bis der nächste fertig ist. */
  readonly runs = signal<readonly ReducedRun[]>([]);
  readonly running = signal(false);
  readonly finishedBots = signal(0);
  readonly totalBots = signal(0);
  readonly error = signal<string | null>(null);

  start(config: SimConfig): void {
    if (this.running()) {
      this.stopWorker();
    }
    this.runId++;
    this.pending = [];
    this.finishedBots.set(0);
    this.totalBots.set(config.bots.length);
    this.error.set(null);
    this.running.set(true);
    const request: SimRequest = { ...config, runId: this.runId };
    try {
      this.worker ??= this.connect();
      this.worker.postMessage(request);
    } catch (error) {
      this.fail(error instanceof Error ? error.message : String(error));
    }
  }

  ngOnDestroy(): void {
    this.stopWorker();
  }

  private connect(): SimWorker {
    const worker = this.createWorker();
    worker.onmessage = ({ data }: MessageEvent<SimResponse>) => this.receive(data);
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.fail(event.message || MODEL_TEXTS.workerCrashed);
    };
    worker.onmessageerror = () => this.fail(MODEL_TEXTS.workerUnreadable);
    return worker;
  }

  private receive(response: SimResponse): void {
    if (response.runId !== this.runId) {
      return;
    }
    switch (response.type) {
      case 'result':
        this.pending.push(response.run);
        this.finishedBots.set(this.pending.length);
        break;
      case 'done':
        this.runs.set(this.pending);
        this.pending = [];
        this.running.set(false);
        break;
      case 'error':
        this.fail(response.message);
        break;
    }
  }

  private fail(message: string): void {
    this.stopWorker();
    this.pending = [];
    this.running.set(false);
    this.error.set(message);
  }

  private stopWorker(): void {
    this.worker?.terminate();
    this.worker = null;
  }
}
