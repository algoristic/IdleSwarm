import { Component, computed, input } from '@angular/core';

import { PillTone } from './pill.model';

const DOT_CLASSES: Record<PillTone, string> = {
  lime: 'size-2 flex-none rounded-full bg-accent-lime',
  yellow: 'size-2 flex-none rounded-full bg-accent-yellow',
  orange: 'size-2 flex-none rounded-full bg-accent-orange',
};

const BAR_BASE = 'block h-full rounded-full transition-all duration-300';

@Component({
  selector: 'app-pill',
  templateUrl: './pill.component.html',
  host: { class: 'block min-w-0 rounded-2xl bg-panel px-2.75 pt-1.75 pb-2 shadow-raised' },
})
export class PillComponent {
  label = input.required<string>();
  tone = input.required<PillTone>();
  extra = input<string | null>(null);
  barFraction = input<number | null>(null);
  barOver = input(false);

  dotClasses = computed(() => DOT_CLASSES[this.tone()]);
  barPercent = computed(() => {
    const fraction = this.barFraction();
    return fraction === null ? null : Math.min(Math.max(fraction, 0), 1) * 100;
  });
  barClasses = computed(
    () => `${BAR_BASE} ${this.barOver() ? 'bg-accent-orange' : 'bg-accent-lime'}`,
  );
}
