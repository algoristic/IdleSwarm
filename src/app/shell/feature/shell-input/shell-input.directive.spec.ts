import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import type { ShellMode, ZoomDirection } from '../../domain/models/shell-mode.model';
import { ShellInputDirective } from './shell-input.directive';

@Component({
  imports: [ShellInputDirective],
  template: `
    <main
      appShellInput
      data-testid="root"
      (zoomedWheel)="zooms.push($event)"
      (pressedShortcut)="shortcuts.push($event)"
      (zoomedPinch)="pinches.push($event)"
    >
      <div class="shell__layer" data-testid="layer">
        <button type="button" data-testid="layer-button" (click)="clicks = clicks + 1">Ziel</button>
      </div>
      <div data-testid="game"><span data-testid="game-inner"></span></div>
      <div data-testid="panel" style="overflow-y: auto">
        <p data-testid="panel-inner"></p>
      </div>
      <input data-testid="input" />
      <div contenteditable="true" data-testid="editable"></div>
      <button type="button" data-testid="button">Knopf</button>
    </main>
  `,
})
class HostComponent {
  zooms: ZoomDirection[] = [];
  shortcuts: ShellMode[] = [];
  pinches: ZoomDirection[] = [];
  clicks = 0;
}

describe('ShellInputDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let now: number;

  const host = () => fixture.componentInstance;
  const byTestId = (testId: string) =>
    (fixture.nativeElement as HTMLElement).querySelector(
      `[data-testid="${testId}"]`,
    ) as HTMLElement;
  const wheel = (testId: string, init: WheelEventInit) =>
    byTestId(testId).dispatchEvent(new WheelEvent('wheel', { bubbles: true, ...init }));
  const key = (target: HTMLElement | Document, init: KeyboardEventInit) =>
    target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, ...init }));

  const pointer = (
    testId: string,
    type: string,
    pointerId: number,
    clientX: number,
    pointerType = 'touch',
  ) => {
    // jsdom kennt `PointerEvent` nicht überall; die Direktive liest nur diese Felder.
    const event = new MouseEvent(type, { bubbles: true, clientX, clientY: 0 });
    Object.assign(event, { pointerId, pointerType });
    byTestId(testId).dispatchEvent(event);
  };

  beforeEach(() => {
    now = 10_000;
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [{ provide: CLOCK, useValue: { now: () => now, monotonic: () => now } }],
    });
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  describe('Mausrad', () => {
    it('meldet die Richtung und sperrt danach 900 ms', () => {
      wheel('game-inner', { deltaY: 100 });
      wheel('game-inner', { deltaY: -100 });
      now += 899;
      wheel('game', { deltaY: -100 });
      now += 1;
      wheel('game', { deltaY: -100 });
      expect(host().zooms).toEqual(['out', 'in']);
    });

    it('ignoriert kleine Ausschläge und rechnet Zeilen in Pixel um', () => {
      wheel('game', { deltaY: 3 });
      expect(host().zooms).toEqual([]);
      wheel('game', { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE });
      expect(host().zooms).toEqual(['out']);
    });

    it('überlässt Strg+Rad dem Browser', () => {
      wheel('game', { deltaY: 100, ctrlKey: true });
      expect(host().zooms).toEqual([]);
    });

    it('scrollt über einem scrollbaren Panel, statt den Modus zu wechseln', () => {
      const panel = byTestId('panel');
      Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 500 });
      Object.defineProperty(panel, 'clientHeight', { configurable: true, value: 200 });
      wheel('panel-inner', { deltaY: 100 });
      wheel('input', { deltaY: 100 });
      expect(host().zooms).toEqual([]);

      // Ohne Überlauf gibt es dort nichts zu scrollen; das Rad zoomt wieder.
      Object.defineProperty(panel, 'scrollHeight', { configurable: true, value: 200 });
      wheel('panel-inner', { deltaY: 100 });
      expect(host().zooms).toEqual(['out']);
    });
  });

  describe('Tasten', () => {
    it('meldet W, G und Esc, auch mit Fokus auf einem Knopf', () => {
      key(document, { key: 'w' });
      key(byTestId('button'), { key: 'G' });
      key(document, { key: 'Escape' });
      key(document, { key: 'x' });
      expect(host().shortcuts).toEqual(['map', 'gen', 'scene']);
    });

    it('löst in Eingabefeldern und bewusst editierbaren Elementen nichts aus', () => {
      key(byTestId('input'), { key: 'w' });
      key(byTestId('input'), { key: 'Escape' });
      key(byTestId('editable'), { key: 'g' });
      expect(host().shortcuts).toEqual([]);
    });

    it('löst mit Strg, Alt oder Meta und beim Halten nichts aus', () => {
      key(document, { key: 'w', ctrlKey: true });
      key(document, { key: 'g', altKey: true });
      key(document, { key: 'g', metaKey: true });
      key(document, { key: 'w', repeat: true });
      expect(host().shortcuts).toEqual([]);
    });

    it('meldet sich beim Zerstören ab', () => {
      fixture.destroy();
      key(document, { key: 'w' });
      expect(host().shortcuts).toEqual([]);
    });
  });

  describe('Pinch', () => {
    it('meldet Auseinander als hinein und Zusammen als hinaus, je Geste einmal', () => {
      pointer('layer', 'pointerdown', 1, 100);
      pointer('layer-button', 'pointerdown', 2, 200);
      pointer('layer', 'pointermove', 2, 230);
      pointer('layer', 'pointermove', 2, 400);
      expect(host().pinches).toEqual(['in']);
      pointer('layer', 'pointerup', 1, 100);
      pointer('layer', 'pointerup', 2, 400);

      pointer('layer', 'pointerdown', 3, 100);
      pointer('layer', 'pointerdown', 4, 200);
      pointer('layer', 'pointermove', 4, 170);
      expect(host().pinches).toEqual(['in', 'out']);
    });

    it('beginnt nicht außerhalb der Spielfläche und nicht mit der Maus', () => {
      pointer('panel', 'pointerdown', 1, 100);
      pointer('panel', 'pointerdown', 2, 200);
      pointer('panel', 'pointermove', 2, 400);
      pointer('layer', 'pointerdown', 3, 100, 'mouse');
      pointer('layer', 'pointerdown', 4, 200, 'mouse');
      pointer('layer', 'pointermove', 4, 400, 'mouse');
      expect(host().pinches).toEqual([]);
    });

    it('unterdrückt den Klick während und kurz nach einer Geste, nicht beim Tippen', () => {
      const click = () => byTestId('layer-button').click();
      pointer('layer', 'pointerdown', 1, 100);
      pointer('layer', 'pointerup', 1, 100);
      click();
      expect(host().clicks).toBe(1);

      pointer('layer', 'pointerdown', 1, 100);
      pointer('layer', 'pointerdown', 2, 200);
      click();
      pointer('layer', 'pointercancel', 1, 100);
      pointer('layer', 'pointerup', 2, 200);
      click();
      now += 400;
      click();
      expect(host().clicks).toBe(2);
    });
  });
});
