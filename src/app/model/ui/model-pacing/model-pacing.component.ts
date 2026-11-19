import { Component, computed, input } from '@angular/core';

import { FormatElapsedPipe } from '@app/shared/ui/pipes/format-elapsed/format-elapsed.pipe';
import { FormatNumPipe } from '@app/shared/ui/pipes/format-num/format-num.pipe';

import type { BotPacing } from '../../domain/pacing-targets-logic';
import { BOT_LABELS } from '../bot-labels/bot-labels';
import { pacingViews } from './pacing-texts';

/** Warnliste der Zielbänder je Bot mit Zielband (US-10.08), wie die Stillstands-Warnliste. */
@Component({
  selector: 'app-model-pacing',
  imports: [FormatElapsedPipe, FormatNumPipe],
  templateUrl: './model-pacing.component.html',
  host: { class: 'block' },
})
export class ModelPacingComponent {
  pacing = input.required<readonly BotPacing[]>();

  views = computed(() => pacingViews(this.pacing()));

  botLabels = BOT_LABELS;
}
