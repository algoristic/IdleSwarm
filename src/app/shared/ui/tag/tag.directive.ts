import { computed, Directive, input } from '@angular/core';

import { TagTone } from './tag.model';

const BASE = 'truncate rounded-xl px-2.5 py-1.25 text-xs font-black empty:hidden';

const TONE_CLASSES: Record<TagTone, string> = {
  gold: 'max-w-9/20 bg-accent-yellow text-on-accent',
  pink: 'bg-accent-pink text-on-accent',
  teal: 'max-w-9/20 bg-accent-cyan text-on-accent',
  ghost: 'max-w-9/20 bg-panel-3 text-fg-muted',
};

@Directive({
  selector: '[appTag]',
  host: { '[class]': 'classes()' },
})
export class TagDirective {
  tone = input.required<TagTone>();

  classes = computed(() => `${BASE} ${TONE_CLASSES[this.tone()]}`);
}
