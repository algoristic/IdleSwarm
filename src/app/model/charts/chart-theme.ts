/** Canvas kennt keine CSS-Variablen; die Werte spiegeln `--hud-*` aus `styles.css`. */
export const CHART_COLORS = {
  surface: '#141d25',
  surfaceRaised: '#1c2832',
  border: '#5c6b78',
  muted: '#a9b6c2',
  text: '#e6edf3',
  accent: '#3fb68b',
} as const;

/** Feste Reihenfolge; auf `--hud-surface` geprüft (Kontrast, Farbsehschwäche). */
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'] as const;

export const MARKER_COLORS = { buy: '#a9b6c2', siteEmpty: '#e66767', newSite: '#9085e9' } as const;

export const CHART_THEME_NAME = 'idleswarm-dark';

const axis = {
  axisLine: { lineStyle: { color: CHART_COLORS.border } },
  axisTick: { lineStyle: { color: CHART_COLORS.border } },
  axisLabel: { color: CHART_COLORS.muted },
  splitLine: { lineStyle: { color: CHART_COLORS.surfaceRaised } },
};

export const CHART_THEME = {
  color: [...SERIES_COLORS],
  backgroundColor: 'transparent',
  textStyle: { color: CHART_COLORS.text },
  legend: {
    textStyle: { color: CHART_COLORS.muted },
    inactiveColor: CHART_COLORS.border,
    pageTextStyle: { color: CHART_COLORS.muted },
    pageIconColor: CHART_COLORS.muted,
    pageIconInactiveColor: CHART_COLORS.border,
  },
  tooltip: {
    backgroundColor: CHART_COLORS.surfaceRaised,
    borderColor: CHART_COLORS.border,
    textStyle: { color: CHART_COLORS.text },
    axisPointer: { lineStyle: { color: CHART_COLORS.border } },
  },
  timeAxis: axis,
  valueAxis: axis,
  logAxis: axis,
  dataZoom: {
    borderColor: CHART_COLORS.border,
    backgroundColor: CHART_COLORS.surface,
    fillerColor: 'rgba(63, 182, 139, 0.15)',
    handleStyle: { color: CHART_COLORS.accent, borderColor: CHART_COLORS.accent },
    moveHandleStyle: { color: CHART_COLORS.border },
    textStyle: { color: CHART_COLORS.muted },
    dataBackground: {
      lineStyle: { color: CHART_COLORS.border },
      areaStyle: { color: CHART_COLORS.surfaceRaised },
    },
  },
};
