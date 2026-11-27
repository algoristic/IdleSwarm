import { Directive } from '@angular/core';

@Directive({
  selector: '[appContextBar]',
  host: {
    class: 'flex h-10 items-center gap-2 rounded-full bg-panel pr-1.5 pl-2.5 text-xs shadow-raised',
  },
})
export class ContextBarDirective {}
