import { Component, computed, input } from '@angular/core';

import { ProgressRingTone } from './progress-ring.model';

const TONE_CLASSES: Record<ProgressRingTone, string> = {
  lime: 'stroke-accent-lime',
  cyan: 'stroke-accent-cyan',
};

@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.component.html',
  host: { class: 'block size-6.5 flex-none', 'aria-hidden': 'true' },
})
export class ProgressRingComponent {
  fraction = input.required<number>();
  tone = input<ProgressRingTone>('lime');

  dashArray = computed(() => `${(Math.min(Math.max(this.fraction(), 0), 1) * 100).toFixed(1)} 100`);
  strokeClasses = computed(() => TONE_CLASSES[this.tone()]);
}
