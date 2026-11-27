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

  function swipe(grip: HTMLButtonElement, fromY: number, toY: number): void {
    grip.dispatchEvent(pointer('pointerdown', fromY));
    grip.dispatchEvent(pointer('pointerup', toY));
  }

  function pointer(type: string, clientY: number): Event {
    return Object.assign(new MouseEvent(type, { clientY, bubbles: true }), { pointerId: 1 });
  }

  it('klappt beim Antippen um', () => {
    swipe(setUp(false), 100, 108);

    expect(emitted).toEqual([true]);
  });

  it('klappt beim Wischen nach unten ein und nach oben aus', () => {
    const grip = setUp(false);

    swipe(grip, 100, 112);
    swipe(grip, 100, 88);

    expect(emitted).toEqual([true, false]);
  });

  it('klappt per Enter und Leertaste um', () => {
    const grip = setUp(true);

    grip.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    grip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

    expect(emitted).toEqual([false, false]);
  });

  it('beschriftet den Griff nach dem Zustand', () => {
    const grip = setUp(true);

    expect(grip.getAttribute('aria-expanded')).toBe('false');
    expect(grip.getAttribute('aria-label')).toBe('Blatt ausklappen');
  });
});
