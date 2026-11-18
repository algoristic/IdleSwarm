import type { BalanceParams } from '../../core/balance/constants';
import type { ActiveBotOptions } from '../../core/sim/bots/active';
import type { IdleBotOptions } from '../../core/sim/bots/idle';
import type { ReducedRun } from './reduce-result';

export const BOT_KINDS = ['active', 'idle'] as const;
export type BotKind = (typeof BOT_KINDS)[number];

/** Bots sind nicht übertragbar; der Worker erzeugt sie aus dieser Beschreibung. */
export type BotSpec =
  | { readonly kind: 'active'; readonly options?: ActiveBotOptions }
  | { readonly kind: 'idle'; readonly options?: IdleBotOptions };

export interface SimConfig {
  readonly seed: string;
  readonly durationMs: number;
  readonly bots: readonly BotSpec[];
  readonly params: Partial<BalanceParams>;
}

export interface SimRequest extends SimConfig {
  readonly runId: number;
}

export type SimResponse =
  | { readonly type: 'result'; readonly runId: number; readonly run: ReducedRun }
  | { readonly type: 'done'; readonly runId: number }
  | { readonly type: 'error'; readonly runId: number; readonly message: string };
