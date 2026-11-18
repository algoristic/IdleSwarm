import { Component, computed, input } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';

import type { ReducedRun } from '../../domain/reduce-result-logic';
import type { TimeRange } from '../../domain/wait-share-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import { metricRows } from './metric-rows';

/** Kennzahlen je Bot. */
@Component({
  selector: 'app-model-metrics',
  imports: [FormatElapsedPipe],
  templateUrl: './model-metrics.component.html',
  host: { class: 'block' },
})
export class ModelMetricsComponent {
  runs = input.required<readonly ReducedRun[]>();
  range = input<TimeRange | null>(null);

  columns = computed(() => this.runs().map((run) => BOT_LABELS[run.bot]));
  rows = computed(() => metricRows(this.runs(), this.range()));
}
