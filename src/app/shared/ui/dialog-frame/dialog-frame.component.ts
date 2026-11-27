import { afterRenderEffect, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-dialog-frame',
  templateUrl: './dialog-frame.component.html',
  host: {
    class: 'contents',
    '(pointerdown)': 'onPointerDown($event)',
    '(click)': 'onClick($event)',
  },
})
export class DialogFrameComponent {
  open = input.required<boolean>();
  label = input<string | null>(null);

  closed = output();

  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  #pressedBackdrop = false;

  constructor() {
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.open() && !dialog.open) {
        dialog.showModal();
      } else if (!this.open() && dialog.open) {
        dialog.close();
      }
    });
  }

  onPointerDown(event: PointerEvent): void {
    this.#pressedBackdrop = event.target === this.dialog().nativeElement;
  }

  onClick(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    const pressedBackdrop = this.#pressedBackdrop;
    this.#pressedBackdrop = false;
    if (event.target === dialog && pressedBackdrop) {
      dialog.close();
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
