import { computed, Directive, input } from '@angular/core';

import { ButtonVariant } from './button.model';

const BASE =
  'rounded-2xl p-2.5 text-center text-sm font-black aria-disabled:opacity-45 disabled:opacity-45';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  default: 'bg-panel-3 shadow-btn',
  warn: 'bg-warn-surface text-warn shadow-btn-warn',
  gold: 'bg-accent-yellow text-on-accent shadow-btn-gold',
};

@Directive({
  selector: '[appButton]',
  host: { '[class]': 'classes()' },
})
export class ButtonDirective {
  variant = input<ButtonVariant>('default');

  classes = computed(() => `${BASE} ${VARIANT_CLASSES[this.variant()]}`);
}
