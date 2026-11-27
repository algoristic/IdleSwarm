import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BottomSheetComponent } from './bottom-sheet.component';

describe('BottomSheetComponent', () => {
  let fixture: ComponentFixture<BottomSheetComponent>;
  let emitted: boolean[];

  function setUp(collapsed: boolean): HTMLButtonElement {
    fixture = TestBed.createComponent(BottomSheetComponent);
    fixture.componentRef.setInput('label', 'Kette');
    fixture.componentRef.setInput('collapsed', collapsed);
    emitted = [];
    fixture.componentInstance.changedCollapsed.subscribe((value) => emitted.push(value));
    fixture.detectChanges();
    const grip = fixture.nativeElement.querySelector('button');
    if (!(grip instanceof HTMLButtonElement)) {
      throw new Error('Griff fehlt');
    }
    grip.setPointerCapture = () => undefined;
    return grip;
  }

  function press(grip: HTMLButtonElement, fromY: number, toY: number, button = 0): void {
    grip.dispatchEvent(pointer('pointerdown', fromY, button));
    grip.dispatchEvent(pointer('pointerup', toY, button));
    if (button === 0) {
      grip.dispatchEvent(new MouseEvent('click', { clientY: toY, detail: 1, bubbles: true }));
    }
  }

  function pointer(type: string, clientY: number, button: number): Event {
    return Object.assign(new MouseEvent(type, { clientY, button, bubbles: true }), {
      pointerId: 1,
    });
  }

  it('klappt beim Antippen um', () => {
    press(setUp(false), 100, 108);

    expect(emitted).toEqual([true]);
  });

  it('klappt bei einem Klick ohne Zeigerereignisse um', () => {
    const grip = setUp(true);

    grip.click();

    expect(emitted).toEqual([false]);
  });

  it('klappt beim Wischen genau einmal ein bzw. aus', () => {
    const grip = setUp(false);

    press(grip, 100, 112);
    press(grip, 100, 88);

    expect(emitted).toEqual([true, false]);
  });

  it('ignoriert andere Tasten als die Primärtaste', () => {
    const grip = setUp(false);

    press(grip, 100, 100, 2);
    press(grip, 100, 130, 1);

    expect(emitted).toEqual([]);
  });

  it('klappt per Tastatur über den nativen Klick um', () => {
    const grip = setUp(true);

    press(grip, 100, 70);
    grip.dispatchEvent(new MouseEvent('click', { detail: 0, bubbles: true }));

    expect(emitted).toEqual([false, false]);
  });

  it('beschriftet den Griff nach dem Zustand', () => {
    const grip = setUp(true);

    expect(grip.getAttribute('aria-expanded')).toBe('false');
    expect(grip.getAttribute('aria-label')).toBe('Blatt ausklappen');
  });
});
