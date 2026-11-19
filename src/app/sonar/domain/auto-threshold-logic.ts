import type { BalanceParams } from '@app/balance/domain/constants';

const PERCENT = 100;

/**
 * Die Oberfläche stellt die Schwelle in ganzen Prozent ein; der Zustand speichert den Anteil
 * (Game-Design §4.12). Krumme Anteile aus Parametern werden für die Anzeige gerundet.
 */
export function thresholdToPercent(threshold: number): number {
  return Math.round(threshold * PERCENT);
}

export function thresholdFromPercent(percent: number): number {
  return percent / PERCENT;
}

/** Höchste einstellbare Schwelle in ganzen Prozent; das Kommando begrenzt ohnehin auf `θ_max`. */
export function maxThresholdPercent(params: BalanceParams): number {
  return thresholdToPercent(params.maxAutoThreshold);
}

/** Liest eine Eingabe wie `25` als ganze Prozent von 0 bis `maxPercent`; sonst `null`. */
export function parseThresholdPercent(text: string, maxPercent: number): number | null {
  const trimmed = text.trim();
  if (!/^\d{1,3}$/.test(trimmed)) {
    return null;
  }
  const percent = Number(trimmed);
  return percent <= maxPercent ? percent : null;
}
