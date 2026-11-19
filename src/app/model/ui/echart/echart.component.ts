import {
  AfterViewInit,
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
import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
} from 'echarts/components';
import { EChartsCoreOption, init, registerTheme, use } from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';

import type { TimeRange } from '../../domain/wait-share-logic';
import { buildChartTheme, CHART_PALETTE, CHART_THEME_NAME } from './chart-theme';

use([
  BarChart,
  LineChart,
  ScatterChart,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  TooltipComponent,
  DataZoomInsideComponent,
  DataZoomSliderComponent,
  CanvasRenderer,
]);

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
    factory: () => {
      const palette = inject(CHART_PALETTE);
      return (host) => {
        registerTheme(CHART_THEME_NAME, buildChartTheme(palette));
        return init(host, CHART_THEME_NAME, { renderer: 'canvas' });
      };
    },
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
  templateUrl: './echart.component.html',
  host: { class: 'block size-full overflow-hidden' },
})
export class EchartComponent implements AfterViewInit {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly #createChart = inject(ECHARTS_INIT);
  readonly #destroyRef = inject(DestroyRef);

  option = input.required<EChartsCoreOption>();
  changedZoom = output<TimeRange>();

  readonly #chart = signal<EchartInstance | null>(null);

  constructor() {
    effect(() => {
      this.#chart()?.setOption(this.option(), { replaceMerge: REPLACED_PARTS });
    });
  }

  ngAfterViewInit(): void {
    const chart = this.#createChart(this.#host);
    chart.on('datazoom', () => this.#emitZoom(chart));
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => chart.resize());
    observer?.observe(this.#host);
    this.#destroyRef.onDestroy(() => {
      observer?.disconnect();
      chart.dispose();
    });
    this.#chart.set(chart);
  }

  #emitZoom(chart: EchartInstance): void {
    const zoom = (chart.getOption() as ZoomState).dataZoom?.[0];
    if (zoom?.startValue !== undefined && zoom.endValue !== undefined) {
      this.changedZoom.emit({ fromMs: zoom.startValue, toMs: zoom.endValue });
    }
  }
}
