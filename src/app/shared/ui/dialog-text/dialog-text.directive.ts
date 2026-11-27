import { Directive } from '@angular/core';

@Directive({
  selector: '[appDialogText]',
  host: { class: 'mb-2 text-sm text-fg-muted' },
})
export class DialogTextDirective {}
