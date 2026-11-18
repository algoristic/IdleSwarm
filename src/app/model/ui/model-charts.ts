import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { formatNum } from '../../core/num/format';
import { buildChartOption, ChartTab } from '../charts/chart-options';
import { MARKER_COLORS } from '../charts/chart-theme';
import { Echart } from '../charts/echart';
import { MARKER_LABELS, MODEL_TEXTS } from '../model-texts.de';
import { EVENT_TYPES, EventType, ReducedRun } from '../sim/reduce-result';
import type { TimeRange } from '../wait-share';

const MARKER_GLYPHS: Readonly<Record<EventType, string>> = {
  buy: '▲',
  siteEmpty: '◆',
  newSite: '●',
};

/** Reiter, Achsenwahl und Markierungen um das Diagramm. */
@Component({
  selector: 'app-model-charts',
  templateUrl: './model-charts.html',
  styleUrl: './model-charts.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Echart],
})
export class ModelCharts {
  readonly runs = input.required<readonly ReducedRun[]>();
  readonly baseline = input<readonly ReducedRun[] | null>(null);
  readonly zoom = input<TimeRange | null>(null);
  readonly zoomChange = output<TimeRange | null>();

  protected readonly texts = MODEL_TEXTS;
  protected readonly tabs: readonly { id: ChartTab; label: string }[] = [
    { id: 'resources', label: MODEL_TEXTS.tabResources },
    { id: 'rates', label: MODEL_TEXTS.tabRates },
    { id: 'decisions', label: MODEL_TEXTS.tabDecisions },
  ];
  protected readonly tab = signal<ChartTab>('resources');
  protected readonly logScale = signal(true);
  protected readonly markers = signal<ReadonlySet<EventType>>(new Set(EVENT_TYPES));
  private readonly zoomResets = signal(0);

  /** Gesamtzahl bleibt sichtbar, auch wenn nur ein Teil gezeichnet wird. */
  protected readonly markerRows = computed(() =>
    EVENT_TYPES.map((type) => {
      const runs = this.runs();
      const shown = runs.reduce(
        (sum, run) => sum + run.events.filter((event) => event.type === type).length,
        0,
      );
      const total = runs.reduce((sum, run) => sum + run.eventTotals[type], 0);
      return {
        type,
        label: MARKER_LABELS[type],
        glyph: MARKER_GLYPHS[type],
        color: MARKER_COLORS[type],
        count: `${formatNum(shown)} ${MODEL_TEXTS.markersOf} ${formatNum(total)}`,
      };
    }),
  );

  /** Der Zoom kommt aus dem Diagramm selbst und löst darum keinen Neuaufbau aus. */
  protected readonly option = computed(() => {
    this.zoomResets();
    return buildChartOption({
      tab: this.tab(),
      runs: this.runs(),
      baseline: this.baseline(),
      logScale: this.logScale(),
      markers: this.markers(),
      zoom: untracked(this.zoom),
    });
  });

  protected toggleMarker(type: EventType): void {
    this.markers.update((markers) => {
      const next = new Set(markers);
      if (!next.delete(type)) {
        next.add(type);
      }
      return next;
    });
  }

  protected resetZoom(): void {
    this.zoomChange.emit(null);
    this.zoomResets.update((count) => count + 1);
  }
}
