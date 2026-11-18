import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { SimConfig } from '../../domain/models/sim.model';
import type { ReducedRun } from '../../domain/reduce-result-logic';
import type { SimError, SimRequest, SimResponse } from './sim-service.model';
import { SIM_WORKER_FACTORY, SimWorker } from './sim-service.tokens';

/** Führt Läufe im Worker aus; `runSimulation` ist synchron, Abbrechen heißt also Beenden. */
@Injectable()
export class SimService {
  readonly #createWorker = inject(SIM_WORKER_FACTORY);
  #worker: SimWorker | null = null;
  #runId = 0;
  #pending: ReducedRun[] = [];

  /** Letzter vollständiger Lauf; bleibt stehen, bis der nächste fertig ist. */
  runs = signal<readonly ReducedRun[]>([]);
  running = signal(false);
  finishedBots = signal(0);
  totalBots = signal(0);
  error = signal<SimError | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  start(config: SimConfig): void {
    if (this.running()) {
      this.#stopWorker();
    }
    this.#runId++;
    this.#pending = [];
    this.finishedBots.set(0);
    this.totalBots.set(config.bots.length);
    this.error.set(null);
    this.running.set(true);
    const request: SimRequest = { ...config, runId: this.#runId };
    try {
      this.#worker ??= this.#connect();
      this.#worker.postMessage(request);
    } catch (error) {
      this.#fail('run-failed', error instanceof Error ? error.message : String(error));
    }
  }

  /** Bricht einen laufenden Lauf ab und beendet den Worker; die Ergebnisse bleiben stehen. */
  stop(): void {
    this.#stopWorker();
    this.#pending = [];
    this.running.set(false);
  }

  #connect(): SimWorker {
    const worker = this.#createWorker();
    worker.onmessage = ({ data }: MessageEvent<SimResponse>) => this.#receive(data);
    worker.onerror = (event: ErrorEvent) => {
      event.preventDefault();
      this.#fail('worker-crashed', event.message || null);
    };
    worker.onmessageerror = () => this.#fail('worker-unreadable', null);
    return worker;
  }

  #receive(response: SimResponse): void {
    if (response.runId !== this.#runId) {
      return;
    }
    switch (response.type) {
      case 'result':
        this.#pending.push(response.run);
        this.finishedBots.set(this.#pending.length);
        break;
      case 'done':
        this.runs.set(this.#pending);
        this.#pending = [];
        this.running.set(false);
        break;
      case 'error':
        this.#fail('run-failed', response.message);
        break;
    }
  }

  #fail(code: SimError['code'], detail: string | null): void {
    this.stop();
    this.error.set({ code, detail });
  }

  #stopWorker(): void {
    this.#worker?.terminate();
    this.#worker = null;
  }
}
