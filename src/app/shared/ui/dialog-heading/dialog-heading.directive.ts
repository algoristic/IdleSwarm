import { Directive } from '@angular/core';

@Directive({
  selector: '[appDialogHeading]',
  host: { class: 'mt-3.5 mb-1.5 text-xs font-black tracking-widest text-fg-muted uppercase' },
})
export class DialogHeadingDirective {}
