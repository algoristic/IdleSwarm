import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  input,
  output,
  signal,
} from '@angular/core';
import { LineChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  TooltipComponent,
} from 'echarts/components';
import { EChartsCoreOption, init, registerTheme, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

import type { TimeRange } from '../wait-share';
import { CHART_THEME, CHART_THEME_NAME } from './chart-theme';

use([
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  CanvasRenderer,
]);
registerTheme(CHART_THEME_NAME, CHART_THEME);

/** Was der Wrapper von einer ECharts-Instanz braucht. */
export interface EchartInstance {
  setOption(option: EChartsCoreOption, options: { replaceMerge: string[] }): void;
  getOption(): unknown;
  on(event: 'datazoom', handler: () => void): void;
  resize(): void;
  dispose(): void;
}

export const ECHARTS_INIT = new InjectionToken<(host: HTMLElement) => EchartInstance>(
  'ECHARTS_INIT',
  {
    providedIn: 'root',
    factory: () => (host) => init(host, CHART_THEME_NAME, { renderer: 'canvas' }),
  },
);

/** Diese Teile ersetzt jede neue Option; die Legende behält so ihre Auswahl. */
const REPLACED_PARTS = ['series', 'xAxis', 'yAxis', 'dataZoom'];

interface ZoomState {
  readonly dataZoom?: readonly { startValue?: number; endValue?: number }[];
}

/** Dünner ECharts-Wrapper (ADR-007); meldet den sichtbaren Zeitraum der x-Achse. */
@Component({
  selector: 'app-echart',
  template: '',
  styles: ':host { display: block; width: 100%; height: 100%; overflow: hidden; }',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Echart implements AfterViewInit {
  readonly option = input.required<EChartsCoreOption>();
  readonly zoomChange = output<TimeRange>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly createChart = inject(ECHARTS_INIT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly chart = signal<EchartInstance | null>(null);

  constructor() {
    effect(() => {
      this.chart()?.setOption(this.option(), { replaceMerge: REPLACED_PARTS });
    });
  }

  ngAfterViewInit(): void {
    const chart = this.createChart(this.host);
    chart.on('datazoom', () => this.emitZoom(chart));
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => chart.resize());
    observer?.observe(this.host);
    this.destroyRef.onDestroy(() => {
      observer?.disconnect();
      chart.dispose();
    });
    this.chart.set(chart);
  }

  private emitZoom(chart: EchartInstance): void {
    const zoom = (chart.getOption() as ZoomState).dataZoom?.[0];
    if (zoom?.startValue !== undefined && zoom.endValue !== undefined) {
      this.zoomChange.emit({ fromMs: zoom.startValue, toMs: zoom.endValue });
    }
  }
}
