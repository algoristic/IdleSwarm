import { DestroyRef, Directive, DOCUMENT, ElementRef, inject, output } from '@angular/core';

import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import type { ShellMode, ZoomDirection } from '../../domain/models/shell-mode.model';
import { shortcutMode, wheelDeltaPixels, wheelZoom } from '../../domain/shell-input-logic';

/** Elemente, in denen Tasten und Rad dem Element gehören (Texteingabe, Auswahl). */
const EDITABLE_SELECTOR =
  'input, textarea, select, [contenteditable]:not([contenteditable="false"])';

/**
 * Desktop-Eingabe der Shell (US-08.05, Mockup K2-K): Mausrad am Host und die Tasten W, G und Esc
 * im Dokument. Meldet nur Zoomrichtung bzw. Zielmodus; was daraus wird, entscheidet die Seite.
 * Das Rad scrollt weiter, wo etwas zu scrollen ist (Panels, Schubladen, linke Spalte), und
 * Strg+Rad (Browser-Zoom, Pinch auf Trackpads) bleibt dem Browser.
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

  #wheelLockedUntilMs = Number.NEGATIVE_INFINITY;

  constructor() {
    const host = this.#host.nativeElement;
    const onWheel = (event: WheelEvent): void => this.#onWheel(event);
    const onKeydown = (event: KeyboardEvent): void => this.#onKeydown(event);
    host.addEventListener('wheel', onWheel, { passive: true });
    this.#document.addEventListener('keydown', onKeydown);
    this.#destroyRef.onDestroy(() => {
      host.removeEventListener('wheel', onWheel);
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

  #onKeydown(event: KeyboardEvent): void {
    if (event.target instanceof Element && event.target.closest(EDITABLE_SELECTOR)) {
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
