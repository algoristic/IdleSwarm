import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** Waagerechter Balken mit ARIA-Werten; der sichtbare Wert steht beim Aufrufer. */
@Component({
  selector: 'app-hud-meter',
  templateUrl: './hud-meter.html',
  styleUrl: './hud-meter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HudMeter {
  /** Füllstand von 0 bis 100. */
  readonly percent = input.required<number>();
  readonly label = input.required<string>();
  readonly valueText = input.required<string>();
  readonly warning = input(false);

  protected readonly wholePercent = computed(() => Math.floor(this.percent()));
}
