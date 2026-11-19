/** Stabile IDs der Strategien (Game-Design §4.12); Spielstände speichern sie, also nicht umbenennen. */
export const STRATEGY_IDS = ['least-resistance', 'balanced', 'battle-hardened'] as const;

export type StrategyId = (typeof STRATEGY_IDS)[number];

/** Strategie in einem neuen Spiel (Game-Design §2.1). */
export const DEFAULT_STRATEGY: StrategyId = 'balanced';

/** Einstellungen des Auto-Weiterziehens (Game-Design §4.12). */
export interface AutoMove {
  readonly enabled: boolean;
  readonly strategy: StrategyId;
  /** Schwelle `θ` als Anteil der Größe (0 = leer). */
  readonly threshold: number;
}

export function isStrategyId(value: unknown): value is StrategyId {
  return (STRATEGY_IDS as readonly unknown[]).includes(value);
}
