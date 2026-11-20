import { DestroyRef, Directive, DOCUMENT, ElementRef, inject, output } from '@angular/core';

import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import type { ShellMode, ZoomDirection } from '../../domain/models/shell-mode.model';
import { shortcutMode, wheelDeltaPixels, wheelZoom } from '../../domain/shell-input-logic';
import {
  PINCH_CLICK_GUARD_MS,
  PINCH_IDLE,
  pinchDown,
  pinchMove,
  PinchPoint,
  pinchUp,
} from '../../domain/shell-pinch-logic';

/** Elemente, in denen Tasten und Rad dem Element gehören (Texteingabe, Auswahl). */
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/** Offener Dialog (ADR-014); solange er offen ist, wechseln Tasten den Modus nicht. */
const OPEN_DIALOG_SELECTOR = 'dialog[open]';

const TOUCH_EVENTS = ['touchstart', 'touchmove', 'touchend', 'touchcancel'] as const;

/** Spielfläche (`touch-action: none` in `shell.page.css`): Nur dort beginnt ein Pinch. */
const PINCH_SURFACE_SELECTOR = '.shell__layer';

/**
 * Eingabe der Shell (US-08.05, US-08.06, Mockup K2-K): Mausrad am Host, die Tasten W, G und Esc
 * im Dokument und Pinch mit zwei Fingern auf der Spielfläche. Meldet nur Zoomrichtung bzw.
 * Zielmodus; was daraus wird, entscheidet die Seite. Das Rad scrollt weiter, wo etwas zu scrollen
 * ist (Panels, Schubladen, linke Spalte), und Strg+Rad (Browser-Zoom, Pinch auf Trackpads) bleibt
 * dem Browser. Panels liegen außerhalb der Spielfläche und scrollen per Touch weiter.
 */
@Directive({
  selector: '[appShellInput]',
})
export class ShellInputDirective {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #clock = inject(CLOCK);
  readonly #destroyRef = inject(DestroyRef);

  zoomedWheel = output<ZoomDirection>();
  pressedShortcut = output<ShellMode>();
  zoomedPinch = output<ZoomDirection>();

  #wheelLockedUntilMs = Number.NEGATIVE_INFINITY;
  #pinch = PINCH_IDLE;
  #clickBlockedUntilMs = Number.NEGATIVE_INFINITY;
  /**
   * Der Browser hat die Pointer der laufenden Geste übernommen (`pointercancel`, etwa weil ein Finger
   * den Genom-Baum schon verschiebt); bis alle Finger los sind, kommt der Pinch aus Touch Events.
   */
  #touchFallback = false;

  constructor() {
    const host = this.#host.nativeElement;
    const onWheel = (event: WheelEvent): void => this.#onWheel(event);
    const onKeydown = (event: KeyboardEvent): void => this.#onKeydown(event);
    const onPointerDown = (event: PointerEvent): void => this.#onPointerDown(event);
    const onPointerMove = (event: PointerEvent): void => this.#onPointerMove(event);
    const onPointerUp = (event: PointerEvent): void => this.#onPointerUp(event);
    const onClick = (event: MouseEvent): void => this.#onClick(event);
    const onTouch = (event: TouchEvent): void => this.#onTouch(event);
    host.addEventListener('wheel', onWheel, { passive: true });
    host.addEventListener('pointerdown', onPointerDown, { passive: true });
    host.addEventListener('pointermove', onPointerMove, { passive: true });
    host.addEventListener('pointerup', onPointerUp, { passive: true });
    host.addEventListener('pointercancel', onPointerUp, { passive: true });
    for (const type of TOUCH_EVENTS) {
      host.addEventListener(type, onTouch, { passive: true });
    }
    // Capture: Der Klick nach einer Geste erreicht weder Knöpfe noch Links der Ebenen.
    host.addEventListener('click', onClick, { capture: true });
    this.#document.addEventListener('keydown', onKeydown);
    this.#destroyRef.onDestroy(() => {
      host.removeEventListener('wheel', onWheel);
      host.removeEventListener('pointerdown', onPointerDown);
      host.removeEventListener('pointermove', onPointerMove);
      host.removeEventListener('pointerup', onPointerUp);
      host.removeEventListener('pointercancel', onPointerUp);
      for (const type of TOUCH_EVENTS) {
        host.removeEventListener(type, onTouch);
      }
      host.removeEventListener('click', onClick, { capture: true });
      this.#document.removeEventListener('keydown', onKeydown);
    });
  }

  #onWheel(event: WheelEvent): void {
    if (event.ctrlKey || this.#scrollsItself(event.target)) {
      return;
    }
    // `deltaY` vor `deltaMode` lesen: Firefox meldet sonst Zeilen statt Pixel.
    const deltaY = event.deltaY;
    const deltaPx = wheelDeltaPixels(
      deltaY,
      event.deltaMode,
      this.#host.nativeElement.clientHeight,
    );
    const zoom = wheelZoom(deltaPx, this.#clock.monotonic(), this.#wheelLockedUntilMs);
    if (zoom) {
      this.#wheelLockedUntilMs = zoom.lockedUntilMs;
      this.zoomedWheel.emit(zoom.direction);
    }
  }

  #onPointerDown(event: PointerEvent): void {
    if (
      event.pointerType !== 'touch' ||
      !(event.target instanceof Element) ||
      !event.target.closest(PINCH_SURFACE_SELECTOR)
    ) {
      return;
    }
    this.#pinch = pinchDown(this.#pinch, pinchPoint(event));
  }

  #onPointerMove(event: PointerEvent): void {
    if (this.#pinch.points.length === 0) {
      return;
    }
    const move = pinchMove(this.#pinch, pinchPoint(event));
    this.#pinch = move.state;
    if (move.zoom) {
      this.zoomedPinch.emit(move.zoom);
    }
  }

  #onPointerUp(event: PointerEvent): void {
    if (
      event.type === 'pointercancel' &&
      this.#pinch.points.some((point) => point.id === event.pointerId)
    ) {
      this.#touchFallback = true;
    }
    this.#release(event.pointerId);
  }

  /**
   * Ersatz, solange der Browser die Pointer übernommen hat: Touch Events kommen weiter (passiv) und
   * speisen denselben Zustandsautomaten. Ohne `pointercancel` bleiben sie unbeachtet, sonst zählte
   * jede Bewegung doppelt.
   */
  #onTouch(event: TouchEvent): void {
    // Eine neue Geste (alle Finger neu) beginnt wieder mit Pointer Events.
    if (event.type === 'touchstart' && event.touches.length === event.changedTouches.length) {
      this.#touchFallback = false;
    }
    if (!this.#touchFallback) {
      return;
    }
    if (event.type === 'touchstart' || event.type === 'touchmove') {
      for (const touch of Array.from(event.touches)) {
        const point = touchPoint(touch);
        if (!this.#pinch.points.some((known) => known.id === point.id)) {
          this.#pinch = pinchDown(this.#pinch, point);
        } else if (event.type === 'touchmove') {
          const move = pinchMove(this.#pinch, point);
          this.#pinch = move.state;
          if (move.zoom) {
            this.zoomedPinch.emit(move.zoom);
          }
        }
      }
      return;
    }
    for (const touch of Array.from(event.changedTouches)) {
      this.#release(touchPoint(touch).id);
    }
    if (event.touches.length === 0) {
      this.#touchFallback = false;
      this.#pinch = PINCH_IDLE;
    }
  }

  #release(id: number): void {
    const release = pinchUp(this.#pinch, id);
    this.#pinch = release.state;
    if (release.endedMultiTouch) {
      this.#clickBlockedUntilMs = this.#clock.monotonic() + PINCH_CLICK_GUARD_MS;
    }
  }

  /** Mit zwei Fingern wird nicht getippt: Klicks während und kurz nach der Geste fallen weg. */
  #onClick(event: MouseEvent): void {
    if (this.#pinch.multiTouch || this.#clock.monotonic() < this.#clickBlockedUntilMs) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  #onKeydown(event: KeyboardEvent): void {
    // Ein offener modaler Dialog gehört der Tastatur allein: Esc schließt ihn, W/G tun nichts.
    if (
      this.#document.querySelector(OPEN_DIALOG_SELECTOR) ||
      (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR))
    ) {
      return;
    }
    const mode = shortcutMode(event);
    if (mode) {
      this.pressedShortcut.emit(mode);
    }
  }

  /**
   * Liegt zwischen Ziel und Host ein Eingabefeld oder ein Element, das gerade senkrecht scrollen
   * kann? Dann scrollt das Rad dort und wechselt nie den Modus, auch nicht am Ende des Inhalts.
   */
  #scrollsItself(target: EventTarget | null): boolean {
    const host = this.#host.nativeElement;
    const view = this.#document.defaultView;
    for (
      let element = target instanceof Element ? target : null;
      element && element !== host;
      element = element.parentElement
    ) {
      if (element.matches(EDITABLE_SELECTOR)) {
        return true;
      }
      const overflowY = view?.getComputedStyle(element).overflowY;
      if (
        (overflowY === 'auto' || overflowY === 'scroll') &&
        element.scrollHeight > element.clientHeight
      ) {
        return true;
      }
    }
    return false;
  }
}

function pinchPoint(event: PointerEvent): PinchPoint {
  return { id: event.pointerId, x: event.clientX, y: event.clientY };
}

/** Touch-IDs liegen in einem eigenen Bereich, damit sie keine Pointer-ID treffen. */
const TOUCH_ID_OFFSET = -1_000_000;

function touchPoint(touch: Touch): PinchPoint {
  return { id: TOUCH_ID_OFFSET - touch.identifier, x: touch.clientX, y: touch.clientY };
}
