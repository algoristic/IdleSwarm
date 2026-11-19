import {
  PACING_TARGETS,
  PacingBand,
  PacingTargetId,
  pacingUnitMs,
  pacingWindowMs,
} from '@app/balance/domain/targets';

import { isPacingBot } from '../../domain/pacing-targets-logic';
import type { ReducedRun } from '../../domain/reduce-result-logic';
import type { ChartPalette } from '../echart/chart-theme';

const BAND_OPACITY = 0.18;

/** Ein Punkt der Fläche; eine fehlende Achse reicht bis zum Rand des Diagramms. */
export interface BandCorner {
  readonly xAxis?: number;
  readonly yAxis?: number;
}

/** Fläche eines Zielbands an der Reihe des Bots, auf die sich das Band bezieht. */
export interface BandArea {
  readonly silent: true;
  readonly itemStyle: { readonly color: string; readonly opacity: number };
  readonly data: readonly (readonly [BandCorner, BandCorner])[];
}

/** Ecken der Fläche in Achsenwerten; `toAxis` rechnet Millisekunden in die Achse um. */
export function bandCorners(
  band: PacingBand,
  toAxis: (ms: number) => number,
  x: { readonly from: number; readonly to: number } | null,
): readonly [BandCorner, BandCorner] {
  const unitMs = pacingUnitMs(band.unit);
  const edge = (bound: PacingBand['min']): BandCorner =>
    bound === null ? {} : { yAxis: toAxis(bound.value * unitMs) };
  const xAt = (value: number): BandCorner => (x === null ? {} : { xAxis: value });
  return [
    { ...xAt(x?.from ?? 0), ...edge(band.min) },
    { ...xAt(x?.to ?? 0), ...edge(band.max) },
  ];
}

/**
 * Fläche des Zielbands `target` für einen Lauf mit Zielband (Aktiv, Idle; US-10.08), sonst `null`.
 * Hat das Band ein Zeitfenster und `timeAxis` ist gesetzt, reicht die Fläche auf der x-Achse nur
 * über das Fenster.
 */
export function targetBandArea(
  run: ReducedRun,
  target: PacingTargetId,
  palette: ChartPalette,
  toAxis: (ms: number) => number,
  timeAxis: boolean,
): BandArea | null {
  const { bot } = run;
  if (!isPacingBot(bot)) {
    return null;
  }
  const entry = PACING_TARGETS.find((item) => item.id === target && item.bot === bot);
  if (entry === undefined) {
    return null;
  }
  const x =
    timeAxis && entry.window !== null
      ? { from: 0, to: Math.min(pacingWindowMs(entry.window), run.durationMs) }
      : null;
  return {
    silent: true,
    itemStyle: { color: palette.bands[bot], opacity: BAND_OPACITY },
    data: [bandCorners(entry.band, toAxis, x)],
  };
}
