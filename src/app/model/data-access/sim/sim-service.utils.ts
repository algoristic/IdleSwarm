import type { Bot } from '@app/engine/domain/bot-logic';
import { runSimulation } from '@app/engine/domain/runner-logic';

import { createActiveBot } from '../../domain/bots/active-bot-logic';
import { createIdleBot } from '../../domain/bots/idle-bot-logic';
import type { BotSpec } from '../../domain/models/sim.model';
import { reduceResult, sampleEveryFor } from '../../domain/reduce-result-logic';
import type { SimRequest, SimResponse } from './sim-service.model';

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
