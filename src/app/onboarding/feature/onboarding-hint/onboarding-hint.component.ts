import { Component, computed, DOCUMENT, ElementRef, inject, input, output } from '@angular/core';

import type { ShellMode } from '@app/shell/domain/models/shell-mode.model';

import type { HintId } from '../../domain/models/onboarding.model';
import { HintCardComponent } from '../../ui/hint-card/hint-card.component';
import { OnboardingFacade } from '../state/onboarding.facade';
import { hintForMode } from '../state/onboarding.utils';

/**
 * Hinweise beim ersten Auftreten einer Mechanik (US-09.04): höchstens einer zur Zeit, der erste
 * offene zum aktuellen Modus. Die Live-Region steht immer im DOM, damit ein neuer Hinweis
 * angesagt wird, ohne den Fokus zu nehmen. Den Platz bestimmt die Shell; lag der Fokus beim
 * Wegklicken in der Karte, meldet `releasedFocus`, damit die Shell ihn neu setzt.
 */
@Component({
  selector: 'app-onboarding-hint',
  imports: [HintCardComponent],
  templateUrl: './onboarding-hint.component.html',
  host: { class: 'block' },
})
export class OnboardingHintComponent {
  facade = inject(OnboardingFacade);
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);

  mode = input.required<ShellMode>();

  releasedFocus = output<void>();

  hint = computed(() => hintForMode(this.facade.pendingHints(), this.mode()));

  onDismiss(hint: HintId): void {
    const hadFocus = this.#host.nativeElement.contains(this.#document.activeElement);
    this.facade.dismissHint(hint);
    if (hadFocus) {
      this.releasedFocus.emit();
    }
  }
}
