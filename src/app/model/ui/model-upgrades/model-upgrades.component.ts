import { Component, computed, input, linkedSignal } from '@angular/core';

import type { BotKind } from '../../domain/models/sim.model';
import type { ReducedRun } from '../../domain/reduce-result-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import { upgradeRowViews } from './upgrade-rows';

/**
 * Wirkung von Upgrades (US-10.07): Kosten, Wirkung, Ertragssteigerung und Amortisation je Upgrade am
 * Endzustand des gewählten Bots.
 */
@Component({
  selector: 'app-model-upgrades',
  templateUrl: './model-upgrades.component.html',
  host: { class: 'block' },
})
export class ModelUpgradesComponent {
  runs = input.required<readonly ReducedRun[]>();

  /** Gewählter Bot; fällt auf den ersten zurück, wenn er im neuen Lauf fehlt. */
  bot = linkedSignal<readonly ReducedRun[], BotKind | null>({
    source: this.runs,
    computation: (runs, previous) => {
      const kept = runs.find((run) => run.bot === previous?.value);
      return kept?.bot ?? runs[0]?.bot ?? null;
    },
  });

  rows = computed(() => {
    const run = this.runs().find((entry) => entry.bot === this.bot());
    return run === undefined ? [] : upgradeRowViews(run.upgrades, run.params);
  });

  botLabels = BOT_LABELS;
}
