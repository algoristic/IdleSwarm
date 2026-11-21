import { Component, computed, input, output } from '@angular/core';

import type { HintId } from '../../domain/models/onboarding.model';
import { HINT_TEXTS } from '../hint-labels/hint-labels';

/**
 * Hinweiskarte (US-09.04): Titel, ein bis zwei Sätze und „Verstanden“. Nicht modal; den Platz und
 * die Live-Region gibt der Aufrufer vor.
 */
@Component({
  selector: 'app-hint-card',
  templateUrl: './hint-card.component.html',
  styleUrl: './hint-card.component.css',
  host: { class: 'block' },
})
export class HintCardComponent {
  hint = input.required<HintId>();

  clickedDismiss = output<HintId>();

  texts = computed(() => HINT_TEXTS[this.hint()]);

  kicker = $localize`:@@uiOnboarding-hintCard-kicker:Hinweis`;

  onDismiss(): void {
    this.clickedDismiss.emit(this.hint());
  }
}
