import { computed, Directive, input } from '@angular/core';

const COLUMN_CLASSES: Record<1 | 2, string> = {
  1: 'mt-3.5 grid gap-2',
  2: 'mt-3.5 grid grid-cols-2 gap-2',
};

@Directive({
  selector: '[appDialogActions]',
  host: { '[class]': 'classes()' },
})
export class DialogActionsDirective {
  columns = input<1 | 2>(1);

  classes = computed(() => COLUMN_CLASSES[this.columns()]);
}
