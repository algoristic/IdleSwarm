import { Component, computed, inject, input, output, signal, untracked } from '@angular/core';

import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import { EVENT_TYPES, EventType, ReducedRun } from '../../domain/reduce-result-logic';
import type { TimeRange } from '../../domain/wait-share-logic';
import { CHART_PALETTE } from '../echart/chart-theme';
import { EchartComponent } from '../echart/echart.component';
import { buildChartOption } from './chart-options';
import type { ChartTab, SiteTab } from './model-charts.model';
import { buildSiteChartOption } from './site-chart-options';

function isSiteTab(tab: ChartTab): tab is SiteTab {
  return tab === 'siteDuration' || tab === 'soldiers';
}

const MARKER_GLYPHS: Readonly<Record<EventType, string>> = {
  buy: '▲',
  siteEmpty: '◆',
  arrived: '●',
};

/** Dieselben Tokens wie die Markierungen im Diagramm (`readChartPalette`). */
const MARKER_CLASSES: Readonly<Record<EventType, string>> = {
  buy: 'text-fg-muted',
  siteEmpty: 'text-danger',
  arrived: 'text-violet',
};

/** Reiter, Achsenwahl und Markierungen um das Diagramm. */
@Component({
  selector: 'app-model-charts',
  imports: [EchartComponent, FormatNumPipe],
  templateUrl: './model-charts.component.html',
  host: { class: 'block' },
})
export class ModelChartsComponent {
  readonly #palette = inject(CHART_PALETTE);

  runs = input.required<readonly ReducedRun[]>();
  baseline = input<readonly ReducedRun[] | null>(null);
  zoom = input<TimeRange | null>(null);

  changedZoom = output<TimeRange | null>();

  tab = signal<ChartTab>('resources');
  logScale = signal(true);
  markers = signal<ReadonlySet<EventType>>(new Set(EVENT_TYPES));
  readonly #zoomResets = signal(0);

  /** Gesamtzahl bleibt sichtbar, auch wenn nur ein Teil gezeichnet wird. */
  markerRows = computed(() =>
    EVENT_TYPES.map((type) => {
      const runs = this.runs();
      const shown = runs.reduce(
        (sum, run) => sum + run.events.filter((event) => event.type === type).length,
        0,
      );
      const total = runs.reduce((sum, run) => sum + run.eventTotals[type], 0);
      return {
        type,
        label: this.#markerLabels[type],
        glyph: MARKER_GLYPHS[type],
        colorClass: MARKER_CLASSES[type],
        shown,
        total,
      };
    }),
  );

  siteTab = computed(() => isSiteTab(this.tab()));

  /** Der Zoom kommt aus dem Diagramm selbst und löst darum keinen Neuaufbau aus. */
  option = computed(() => {
    const tab = this.tab();
    this.#zoomResets();
    if (isSiteTab(tab)) {
      return buildSiteChartOption({
        tab,
        runs: this.runs(),
        logScale: this.logScale(),
        palette: this.#palette,
      });
    }
    return buildChartOption({
      tab,
      runs: this.runs(),
      baseline: this.baseline(),
      logScale: this.logScale(),
      markers: this.markers(),
      zoom: untracked(this.zoom),
      palette: this.#palette,
    });
  });

  tabs: readonly { id: ChartTab; label: string }[] = [
    { id: 'resources', label: $localize`:@@uiModel-modelCharts-tab-resources:Ressourcen` },
    { id: 'rates', label: $localize`:@@uiModel-modelCharts-tab-rates:Raten` },
    { id: 'decisions', label: $localize`:@@uiModel-modelCharts-tab-decisions:Entscheidungen` },
    {
      id: 'siteDuration',
      label: $localize`:@@uiModel-modelCharts-tab-siteDuration:Dauer je Futterstelle`,
    },
    {
      id: 'soldiers',
      label: $localize`:@@uiModel-modelCharts-tab-soldiers:Soldaten vor/nach Einnahme`,
    },
  ];
  chartsLabel = $localize`:@@uiModel-modelCharts-label:Diagramme`;
  markersLabel = $localize`:@@uiModel-modelCharts-markers:Markierungen`;
  readonly #markerLabels: Readonly<Record<EventType, string>> = {
    buy: $localize`:@@uiModel-modelCharts-marker-buy:Kauf`,
    siteEmpty: $localize`:@@uiModel-modelCharts-marker-siteEmpty:Futterstelle leer`,
    arrived: $localize`:@@uiModel-modelCharts-marker-arrived:Weitergezogen`,
  };

  onToggleMarker(type: EventType): void {
    this.markers.update((markers) => {
      const next = new Set(markers);
      if (!next.delete(type)) {
        next.add(type);
      }
      return next;
    });
  }

  /** Der Zoom der Reiter je Futterstelle zählt Kategorien, keine Zeit; er bleibt im Diagramm. */
  onChangedZoom(zoom: TimeRange): void {
    if (!this.siteTab()) {
      this.changedZoom.emit(zoom);
    }
  }

  onResetZoom(): void {
    if (!this.siteTab()) {
      this.changedZoom.emit(null);
    }
    this.#zoomResets.update((count) => count + 1);
  }
}
