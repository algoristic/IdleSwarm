import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';

import { DEFAULT_BALANCE } from '@app/balance/domain/constants';

import { SimService } from '../../data-access/sim/sim.service';
import { defaultModelParams, sameSimConfig, toSimConfig } from '../../domain/model-params-logic';
import type { ModelParamsValue } from '../../domain/models/model-params.model';
import type { SimConfig } from '../../domain/models/sim.model';
import type { StallThresholdValue } from '../../domain/models/stall.model';
import type { ReducedRun } from '../../domain/reduce-result-logic';
import { botStalls, defaultStallThreshold, stallThresholdMs } from '../../domain/stall-logic';
import type { TimeRange } from '../../domain/wait-share-logic';

export const RUN_DEBOUNCE_MS = 400;

/** Zugang der Modell-Seite: Parameter, Läufe im Worker, Basislauf und Zoom. */
@Injectable()
export class ModelFacade {
  readonly #sim = inject(SimService);

  /** Formularmodell des Parameter-Panels; die Formular-Komponente bearbeitet es direkt. */
  params = signal<ModelParamsValue>(defaultModelParams(DEFAULT_BALANCE));
  config = computed<SimConfig | null>(() => toSimConfig(this.params(), DEFAULT_BALANCE), {
    equal: sameSimConfig,
  });

  runs = this.#sim.runs.asReadonly();
  running = this.#sim.running.asReadonly();
  finishedBots = this.#sim.finishedBots.asReadonly();
  totalBots = this.#sim.totalBots.asReadonly();
  error = this.#sim.error.asReadonly();
  hasRuns = computed(() => this.runs().length > 0);

  /** Analyse-Parameter: wertet das Ergebnis neu aus, ohne einen Lauf zu starten. */
  stallThreshold = signal<StallThresholdValue>(defaultStallThreshold());
  readonly #stallThresholdMs = computed(() => stallThresholdMs(this.stallThreshold()));
  stalls = computed(() => {
    const thresholdMs = this.#stallThresholdMs();
    return thresholdMs === null ? null : botStalls(this.runs(), thresholdMs);
  });

  baseline = signal<readonly ReducedRun[] | null>(null);
  baselineSeed = computed(() => this.baseline()?.[0]?.seed ?? null);

  readonly #durationMs = computed(() => this.runs()[0]?.durationMs ?? 0);
  readonly #zoomState = signal<{ durationMs: number; range: TimeRange | null } | null>(null);
  /** Ein Lauf anderer Dauer hat eine andere Achse; der alte Ausschnitt gilt dort nicht. */
  zoom = computed(() => {
    const state = this.#zoomState();
    return state?.durationMs === this.#durationMs() ? state.range : null;
  });

  #lastStarted: SimConfig | null = null;

  constructor() {
    // Seiteneffekt nach außen: Jede gültige Änderung startet entprellt einen Lauf im Worker.
    effect((onCleanup) => {
      const config = this.config();
      if (config === null || config === this.#lastStarted) {
        return;
      }
      if (this.#lastStarted === null) {
        untracked(() => this.#start(config));
        return;
      }
      // „Starten“ kann den entprellten Lauf schon vorweggenommen haben.
      const timer = setTimeout(() => {
        if (config !== this.#lastStarted) {
          this.#start(config);
        }
      }, RUN_DEBOUNCE_MS);
      onCleanup(() => clearTimeout(timer));
    });
  }

  run(): void {
    const config = this.config();
    if (config !== null) {
      this.#start(config);
    }
  }

  /** Bricht einen laufenden Lauf beim Verlassen der Seite ab. */
  stop(): void {
    this.#sim.stop();
  }

  setZoom(range: TimeRange | null): void {
    this.#zoomState.set({ durationMs: this.#durationMs(), range });
  }

  pinBaseline(): void {
    this.baseline.set(this.runs());
  }

  clearBaseline(): void {
    this.baseline.set(null);
  }

  #start(config: SimConfig): void {
    this.#lastStarted = config;
    this.#sim.start(config);
  }
}
