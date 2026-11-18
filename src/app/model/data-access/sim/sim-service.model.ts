import type { SimConfig } from '../../domain/models/sim.model';
import type { ReducedRun } from '../../domain/reduce-result-logic';

/** Anfrage an den Sim-Worker; `runId` ordnet die Antworten dem Lauf zu. */
export interface SimRequest extends SimConfig {
  readonly runId: number;
}

export type SimResponse =
  | { readonly type: 'result'; readonly runId: number; readonly run: ReducedRun }
  | { readonly type: 'done'; readonly runId: number }
  | { readonly type: 'error'; readonly runId: number; readonly message: string };

/** Fehler eines Laufs; die Seite bildet den Code auf einen Text ab, `detail` stammt vom Worker. */
export interface SimError {
  readonly code: 'run-failed' | 'worker-crashed' | 'worker-unreadable';
  readonly detail: string | null;
}
