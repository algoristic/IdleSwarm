import { afterRenderEffect, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-dialog-frame',
  templateUrl: './dialog-frame.component.html',
  host: { class: 'contents', '(click)': 'onClick($event)' },
})
export class DialogFrameComponent {
  open = input.required<boolean>();
  label = input<string | null>(null);

  closed = output();

  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

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

  onClick(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    if (event.target === dialog) {
      dialog.close();
    }
  }

  onClose(): void {
    this.closed.emit();
  }
}
