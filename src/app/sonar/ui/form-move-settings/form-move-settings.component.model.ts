import type { StrategyId } from '@app/site/domain/models/auto-move.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

/** Einstellungen aus dem Spielstand (Game-Design §4.9, §4.12). */
export interface MoveSettingsView {
  readonly priority: TransportPriority;
  readonly strategy: StrategyId;
  readonly autoEnabled: boolean;
  /** Schwelle in ganzen Prozent. */
  readonly thresholdPercent: number;
  readonly maxThresholdPercent: number;
}

/** Werte, die die Controls bearbeiten; die Schwelle als Text. */
export interface MoveSettingsFormValue {
  readonly priority: TransportPriority;
  readonly autoEnabled: boolean;
  readonly thresholdPercent: string;
}
