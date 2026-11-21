import { computed, inject, Injectable } from '@angular/core';

import { GameStore } from '@app/engine/data-access/game-store/game-store.service';

import type { HintId } from '../../domain/models/onboarding.model';
import { pendingHints } from '../../domain/onboarding-logic';

/** Zugang zu den Hinweisen (US-09.04): offene Hinweise und Wegklicken über `markHintSeen`. */
@Injectable()
export class OnboardingFacade {
  readonly #store = inject(GameStore);

  /** Neue Referenz nur bei einer Freischaltung oder einem gesehenen Hinweis, nicht je Tick. */
  readonly #onboarding = computed(() => this.#store.state().onboarding);

  pendingHints = computed(() => pendingHints(this.#onboarding()));

  dismissHint(hint: HintId): void {
    this.#store.dispatch({ type: 'markHintSeen', hint });
  }
}
