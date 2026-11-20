import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalDialogComponent } from './modal-dialog.component';

@Component({
  imports: [ModalDialogComponent],
  template: `
    <app-modal-dialog
      testId="test.dialog"
      heading="Titel"
      [open]="open()"
      (closed)="closes = closes + 1"
    >
      <p>Inhalt</p>
    </app-modal-dialog>
  `,
})
class HostComponent {
  open = signal(false);
  closes = 0;
}

describe('ModalDialogComponent', () => {
  let fixture: ComponentFixture<HostComponent>;

  const dialog = () =>
    (fixture.nativeElement as HTMLElement).querySelector('dialog') as HTMLDialogElement;

  const showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  const close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
    this.dispatchEvent(new Event('close'));
  });

  beforeEach(async () => {
    // jsdom kennt `showModal()` und `close()` nicht; nachgebildet wird nur das Attribut `open`.
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    fixture = TestBed.createComponent(HostComponent);
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.clearAllMocks();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('öffnet und schließt modal nach dem Input und benennt den Dialog über den Titel', async () => {
    expect(dialog().open).toBe(false);
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog().open).toBe(true);
    const headingId = dialog().getAttribute('aria-labelledby') ?? '';
    expect(document.getElementById(headingId)?.textContent).toBe('Titel');

    fixture.componentInstance.open.set(false);
    await fixture.whenStable();
    expect(dialog().open).toBe(false);
    // Schließt der Aufrufer selbst, meldet der Dialog nichts.
    expect(fixture.componentInstance.closes).toBe(0);
  });

  it('meldet Esc und den Schließen-Knopf, bleibt aber offen, bis der Aufrufer schließt', async () => {
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    const cancel = new Event('cancel', { cancelable: true });
    dialog().dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog().open).toBe(true);
    (
      (fixture.nativeElement as HTMLElement).querySelector(
        '[data-testid="test.dialog.close"]',
      ) as HTMLButtonElement
    ).click();
    expect(fixture.componentInstance.closes).toBe(2);
  });

  it('meldet ein Schließen durch den Browser nachträglich', async () => {
    fixture.componentInstance.open.set(true);
    await fixture.whenStable();
    dialog().removeAttribute('open');
    dialog().dispatchEvent(new Event('close'));
    expect(fixture.componentInstance.closes).toBe(1);
  });
});
