import { Component, computed, input, output } from '@angular/core';

import { BottomSheetTone } from './bottom-sheet.model';

const SWIPE_THRESHOLD_PX = 12;

const BASE =
  'absolute inset-x-0 bottom-0 z-5 block rounded-t-3xl shadow-sheet transition-transform duration-350 ease-glide motion-reduce:transition-none';

const TONE_CLASSES: Record<BottomSheetTone, string> = {
  default: 'bg-panel',
  neuron: 'bg-panel-neuron',
};

interface GripGesture {
  pointerId: number;
  startY: number;
}

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrl: './bottom-sheet.component.css',
  host: {
    role: 'region',
    '[attr.aria-label]': 'label()',
    '[class]': 'classes()',
  },
})
export class BottomSheetComponent {
  label = input.required<string>();
  collapsed = input.required<boolean>();
  tone = input<BottomSheetTone>('default');
  gripTestId = input<string | null>(null);

  changedCollapsed = output<boolean>();

  classes = computed(
    () =>
      `${BASE} ${TONE_CLASSES[this.tone()]}${this.collapsed() ? ' bottom-sheet--collapsed' : ''}`,
  );
  gripLabel = computed(() => (this.collapsed() ? this.expandLabel : this.collapseLabel));

  collapseLabel = $localize`:@@uiShared-bottomSheet-collapse:Blatt einklappen`;
  expandLabel = $localize`:@@uiShared-bottomSheet-expand:Blatt ausklappen`;

  #gesture: GripGesture | null = null;

  onGripPointerDown(event: PointerEvent): void {
    this.#gesture = { pointerId: event.pointerId, startY: event.clientY };
    if (event.currentTarget instanceof Element) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  }

  onGripPointerUp(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (gesture === null || gesture.pointerId !== event.pointerId) {
      return;
    }
    this.#gesture = null;
    const dy = event.clientY - gesture.startY;
    this.changedCollapsed.emit(Math.abs(dy) < SWIPE_THRESHOLD_PX ? !this.collapsed() : dy > 0);
  }

  onGripPointerCancel(): void {
    this.#gesture = null;
  }

  onGripKey(event: Event): void {
    event.preventDefault();
    this.changedCollapsed.emit(!this.collapsed());
  }
}
