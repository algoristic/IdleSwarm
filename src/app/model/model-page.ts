import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';

import { ModelForm } from './model-form';
import { MODEL_TEXTS } from './model-texts.de';
import type { ReducedRun } from './sim/reduce-result';
import { SimClient } from './sim/sim-client';
import type { SimConfig } from './sim/sim-protocol';
import { ModelCharts } from './ui/model-charts';
import { ModelMetrics } from './ui/model-metrics';
import { ModelParams } from './ui/model-params';
import type { TimeRange } from './wait-share';

export const RUN_DEBOUNCE_MS = 400;

/** Modell-Seite (US-10.01 bis 10.05): Bot-Läufe im Worker, Diagramme und Kennzahlen. */
@Component({
  selector: 'app-model-page',
  templateUrl: './model-page.html',
  styleUrl: './model-page.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModelCharts, ModelMetrics, ModelParams],
  providers: [SimClient],
})
export class ModelPage {
  protected readonly client = inject(SimClient);
  protected readonly form = new ModelForm();
  protected readonly texts = MODEL_TEXTS;

  protected readonly baseline = signal<readonly ReducedRun[] | null>(null);
  protected readonly hasRuns = computed(() => this.client.runs().length > 0);
  protected readonly baselineInfo = computed(() => {
    const run = this.baseline()?.[0];
    if (run === undefined) {
      return null;
    }
    return `${MODEL_TEXTS.baselineInfo}: ${MODEL_TEXTS.seed} ${run.seed}`;
  });

  private readonly durationMs = computed(() => this.client.runs()[0]?.durationMs ?? 0);
  private readonly zoomState = signal<{ durationMs: number; range: TimeRange | null } | null>(null);
  /** Ein Lauf anderer Dauer hat eine andere Achse; der alte Ausschnitt gilt dort nicht. */
  protected readonly zoom = computed(() => {
    const state = this.zoomState();
    return state?.durationMs === this.durationMs() ? state.range : null;
  });

  private lastStarted: SimConfig | null = null;

  constructor() {
    effect((onCleanup) => {
      const config = this.form.config();
      if (config === null || config === this.lastStarted) {
        return;
      }
      if (this.lastStarted === null) {
        untracked(() => this.startRun(config));
        return;
      }
      // „Starten“ kann den entprellten Lauf schon vorweggenommen haben.
      const timer = setTimeout(() => {
        if (config !== this.lastStarted) {
          this.startRun(config);
        }
      }, RUN_DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  protected run(): void {
    const config = this.form.config();
    if (config !== null) {
      this.startRun(config);
    }
  }

  protected setZoom(range: TimeRange | null): void {
    this.zoomState.set({ durationMs: this.durationMs(), range });
  }

  protected pinBaseline(): void {
    this.baseline.set(this.client.runs());
  }

  private startRun(config: SimConfig): void {
    this.lastStarted = config;
    this.client.start(config);
  }
}
