import { Component, computed, input, output } from '@angular/core';

import { SegmentButtonView, SegmentOption, SegmentSize, SegmentTone } from './segment.model';

const HOST_CLASSES: Record<SegmentSize, string> = {
  default: 'flex rounded-2xl bg-canvas p-0.75',
  compact: 'flex rounded-2xl bg-canvas p-0.5',
};

const BUTTON_CLASSES: Record<SegmentSize, string> = {
  default: 'rounded-xl px-2.75 py-1.25 text-xs font-extrabold text-fg-muted',
  compact: 'rounded-xl px-2.5 py-1 text-xs font-extrabold whitespace-nowrap text-fg-muted',
};

const PRESSED_CLASSES: Record<SegmentTone, string> = {
  default: 'aria-pressed:bg-fg aria-pressed:text-on-accent',
  orange: 'aria-pressed:bg-accent-orange aria-pressed:text-on-accent',
  pink: 'aria-pressed:bg-accent-pink aria-pressed:text-on-accent',
};

@Component({
  selector: 'app-segment',
  templateUrl: './segment.component.html',
  host: {
    role: 'group',
    '[attr.aria-label]': 'label()',
    '[class]': 'hostClasses()',
  },
})
export class SegmentComponent<T extends string = string> {
  options = input.required<readonly SegmentOption<T>[]>();
  selected = input.required<T>();
  label = input.required<string>();
  size = input<SegmentSize>('default');

  selectedOption = output<T>();

  hostClasses = computed(() => HOST_CLASSES[this.size()]);
  buttons = computed<SegmentButtonView<T>[]>(() => {
    const buttonClasses = BUTTON_CLASSES[this.size()];
    return this.options().map((option) => ({
      id: option.id,
      label: option.label,
      pressed: option.id === this.selected(),
      classes: `${buttonClasses} ${PRESSED_CLASSES[option.tone ?? 'default']}`,
      testId: option.testId ?? null,
    }));
  });

  onSelect(id: T): void {
    this.selectedOption.emit(id);
  }
}
