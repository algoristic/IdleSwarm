import { Component, ElementRef, inject, output } from '@angular/core';

@Component({
  selector: 'app-toast',
  templateUrl: './toast.component.html',
  host: {
    class:
      'block max-w-full animate-toast rounded-xl bg-canvas px-2.75 py-1.5 text-center text-xs font-bold shadow-toast',
    '(animationend)': 'onAnimationEnd($event)',
  },
})
export class ToastComponent {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);

  expired = output();

  onAnimationEnd(event: AnimationEvent): void {
    if (event.target === this.#host.nativeElement) {
      this.expired.emit();
    }
  }
}
