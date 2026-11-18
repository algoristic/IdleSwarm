import type { BalanceParams } from '@app/balance/domain/constants';

import type { ActiveBotOptions } from '../bots/active-bot-logic';
import type { IdleBotOptions } from '../bots/idle-bot-logic';

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
