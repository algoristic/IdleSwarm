import { afterRenderEffect, Component, ElementRef, input, output, viewChild } from '@angular/core';

/** Zähler für eindeutige Titel-IDs (`aria-labelledby`) mehrerer Dialoge. */
let nextHeadingId = 0;

/**
 * Modaler Dialog über das native `<dialog>` mit `showModal()` (ADR-014): Fokusfalle, Esc und das
 * Sperren der restlichen Seite (`inert`) übernimmt der Browser, der Dialog liegt im Top-Layer.
 * Offen oder geschlossen bestimmt der Aufrufer über `open`; Esc und der Schließen-Knopf melden nur
 * `closed`, geschlossen wird erst, wenn `open` auf `false` geht. Der Inhalt kommt per Projektion.
 */
@Component({
  selector: 'app-modal-dialog',
  templateUrl: './modal-dialog.component.html',
  styleUrl: './modal-dialog.component.css',
  host: { class: 'contents' },
})
export class ModalDialogComponent {
  open = input.required<boolean>();
  heading = input.required<string>();
  /** Basis der Test-IDs: `<testId>` am Dialog, `<testId>.close` am Schließen-Knopf. */
  testId = input.required<string>();

  headingId = `modal-dialog-heading-${nextHeadingId++}`;

  closed = output<void>();

  dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  closeLabel = $localize`:@@uiShared-modalDialog-close:Schließen`;

  constructor() {
    // Seiteneffekt ins DOM: erst nach dem Rendern, dann ist das Element da.
    afterRenderEffect(() => {
      const dialog = this.dialog().nativeElement;
      const open = this.open();
      if (open && !dialog.open) {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });
  }

  /** Esc: offen bleiben und dem Aufrufer melden; er entscheidet über `open`. */
  onCancel(event: Event): void {
    event.preventDefault();
    this.closed.emit();
  }

  /**
   * Der Browser darf Esc ohne vorherige Eingabe nicht abbrechbar machen (Close Watcher) und schließt
   * dann selbst; dann meldet der Dialog es nachträglich.
   */
  onClose(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }

  onClickClose(): void {
    this.closed.emit();
  }
}
