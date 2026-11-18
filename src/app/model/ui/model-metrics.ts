import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { metricRows } from '../metrics';
import { formatElapsed } from '../model-format';
import { BOT_LABELS, MODEL_TEXTS } from '../model-texts.de';
import type { ReducedRun } from '../sim/reduce-result';
import type { TimeRange } from '../wait-share';

/** Kennzahlen je Bot. */
@Component({
  selector: 'app-model-metrics',
  templateUrl: './model-metrics.html',
  styleUrl: './model-metrics.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelMetrics {
  readonly runs = input.required<readonly ReducedRun[]>();
  readonly range = input<TimeRange | null>(null);

  protected readonly texts = MODEL_TEXTS;
  protected readonly columns = computed(() => this.runs().map((run) => BOT_LABELS[run.bot]));
  protected readonly rows = computed(() => metricRows(this.runs(), this.range()));
  protected readonly rangeText = computed(() => {
    const range = this.range();
    return range === null
      ? MODEL_TEXTS.rangeAll
      : `${MODEL_TEXTS.rangePrefix} ${formatElapsed(range.fromMs)} – ${formatElapsed(range.toMs)}`;
  });
}
