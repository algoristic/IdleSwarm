import type { BotKind } from '../../domain/models/sim.model';

/** Namen der Bots in Diagrammen, Kennzahlen und Parametern. */
export const BOT_LABELS: Readonly<Record<BotKind, string>> = {
  active: $localize`:@@uiModel-botLabels-active:Aktiv`,
  idle: $localize`:@@uiModel-botLabels-idle:Idle`,
};
