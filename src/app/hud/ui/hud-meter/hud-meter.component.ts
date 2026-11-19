import { Component, computed, input } from '@angular/core';

import type { HudMeterSize, HudMeterTone } from './hud-meter.component.model';

/** Höhe und Rundung je Größe (Mockup `.top .bar` bzw. `.mini`). */
const SIZE_CLASSES: Readonly<Record<HudMeterSize, { track: string; fill: string }>> = {
  md: { track: 'h-3 rounded-md', fill: 'rounded-md' },
  sm: { track: 'h-2 rounded-sm', fill: 'rounded-sm' },
};

/** Füllung je Ton; der Warnzustand färbt über `data-warning` um. */
const FILL_CLASSES: Readonly<Record<HudMeterTone, string>> = {
  accent: 'bg-accent',
  site: 'bg-site',
};

/** Waagerechter Balken mit ARIA-Werten; der sichtbare Wert steht beim Aufrufer. */
@Component({
  selector: 'app-hud-meter',
  templateUrl: './hud-meter.component.html',
  host: { class: 'block' },
})
export class HudMeterComponent {
  /** Füllstand von 0 bis 100. */
  percent = input.required<number>();
  label = input.required<string>();
  valueText = input.required<string>();
  warning = input(false);
  tone = input<HudMeterTone>('accent');
  size = input<HudMeterSize>('md');

  wholePercent = computed(() => Math.floor(this.percent()));
  trackClass = computed(() => `overflow-hidden bg-well ${SIZE_CLASSES[this.size()].track}`);
  fillClass = computed(
    () =>
      `h-full data-warning:bg-warning ${SIZE_CLASSES[this.size()].fill} ${FILL_CLASSES[this.tone()]}`,
  );
}
