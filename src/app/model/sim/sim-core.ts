import type { Bot } from '../../core/sim/bots/bot';
import { createActiveBot } from '../../core/sim/bots/active';
import { createIdleBot } from '../../core/sim/bots/idle';
import { runSimulation } from '../../core/sim/runner';
import { reduceResult, sampleEveryFor } from './reduce-result';
import type { BotSpec, SimRequest, SimResponse } from './sim-protocol';

export function createBot(spec: BotSpec): Bot {
  return spec.kind === 'active' ? createActiveBot(spec.options) : createIdleBot(spec.options);
}

/** Kern des Workers: rechnet die Bots nacheinander und meldet jedes Ergebnis einzeln. */
export function handleSimRequest(
  request: SimRequest,
  post: (response: SimResponse) => void,
  now: () => number,
): void {
  const { runId, seed, durationMs, params, bots } = request;
  try {
    for (const spec of bots) {
      const startedAt = now();
      const result = runSimulation({
        seed,
        durationMs,
        params,
        bot: createBot(spec),
        sampleEveryMs: sampleEveryFor(durationMs),
      });
      const run = reduceResult(result, spec.kind, now() - startedAt);
      post({ type: 'result', runId, run });
    }
    post({ type: 'done', runId });
  } catch (error) {
    post({
      type: 'error',
      runId,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
