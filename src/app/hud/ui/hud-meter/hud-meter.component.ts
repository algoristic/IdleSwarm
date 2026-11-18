import { Component, computed, input } from '@angular/core';

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

  wholePercent = computed(() => Math.floor(this.percent()));
}
