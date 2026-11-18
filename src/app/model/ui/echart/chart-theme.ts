import { DOCUMENT, inject, InjectionToken } from '@angular/core';

import type { EventType } from '../../domain/reduce-result-logic';

/** Farben der Diagramme, gelesen aus den `--sw-*`-Tokens in `styles.css`. */
export interface ChartPalette {
  readonly surface: string;
  readonly surfaceRaised: string;
  readonly border: string;
  readonly muted: string;
  readonly text: string;
  readonly accent: string;
  /** Feste Reihenfolge der Linien eines Reiters. */
  readonly series: readonly string[];
  readonly markers: Readonly<Record<EventType, string>>;
}

const SERIES_TOKENS = [
  '--sw-chart-1',
  '--sw-chart-2',
  '--sw-chart-3',
  '--sw-chart-4',
  '--sw-chart-5',
];

/** Liest die Palette über eine Funktion, die zu einem Token-Namen den Wert liefert. */
export function readChartPalette(token: (name: string) => string): ChartPalette {
  return {
    surface: token('--sw-surface'),
    surfaceRaised: token('--sw-surface-raised'),
    border: token('--sw-border-control'),
    muted: token('--sw-fg-muted'),
    text: token('--sw-fg'),
    accent: token('--sw-accent'),
    series: SERIES_TOKENS.map(token),
    markers: {
      buy: token('--sw-fg-muted'),
      siteEmpty: token('--sw-danger'),
      newSite: token('--sw-violet'),
    },
  };
}

/** Canvas kennt keine CSS-Variablen; die Palette wird einmal je Seite aus den Tokens gelesen. */
export const CHART_PALETTE = new InjectionToken<ChartPalette>('CHART_PALETTE', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    const style = document.defaultView?.getComputedStyle(document.documentElement);
    return readChartPalette((name) => style?.getPropertyValue(name).trim() ?? '');
  },
});

export const CHART_THEME_NAME = 'idleswarm-dark';

export function buildChartTheme(palette: ChartPalette) {
  const axis = {
    axisLine: { lineStyle: { color: palette.border } },
    axisTick: { lineStyle: { color: palette.border } },
    axisLabel: { color: palette.muted },
    splitLine: { lineStyle: { color: palette.surfaceRaised } },
  };
  return {
    color: [...palette.series],
    backgroundColor: 'transparent',
    textStyle: { color: palette.text },
    legend: {
      textStyle: { color: palette.muted },
      inactiveColor: palette.border,
      pageTextStyle: { color: palette.muted },
      pageIconColor: palette.muted,
      pageIconInactiveColor: palette.border,
    },
    tooltip: {
      backgroundColor: palette.surfaceRaised,
      borderColor: palette.border,
      textStyle: { color: palette.text },
      axisPointer: { lineStyle: { color: palette.border } },
    },
    timeAxis: axis,
    valueAxis: axis,
    logAxis: axis,
    dataZoom: {
      borderColor: palette.border,
      backgroundColor: palette.surface,
      fillerColor: 'transparent',
      handleStyle: { color: palette.accent, borderColor: palette.accent },
      moveHandleStyle: { color: palette.border },
      textStyle: { color: palette.muted },
      dataBackground: {
        lineStyle: { color: palette.border },
        areaStyle: { color: palette.surfaceRaised },
      },
    },
  };
}
