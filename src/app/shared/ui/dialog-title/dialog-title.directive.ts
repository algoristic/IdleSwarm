import { Directive } from '@angular/core';

@Directive({
  selector: '[appDialogTitle]',
  host: { class: 'mb-1 text-xl font-black' },
})
export class DialogTitleDirective {}
