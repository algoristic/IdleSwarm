import { Directive, effect, ElementRef, inject, input } from '@angular/core';

@Directive({
  selector: '[appSmilBegin]',
  host: { begin: 'indefinite' },
})
export class SmilBeginDirective {
  readonly #element = inject<ElementRef<SVGAnimationElement>>(ElementRef);

  appSmilBegin = input.required<string>();

  constructor() {
    effect(() => {
      const animation = this.#element.nativeElement;
      animation.setAttribute('begin', this.appSmilBegin());
      animation.beginElement();
    });
  }
}
