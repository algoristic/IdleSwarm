import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
} from '@angular/core';

import { stageLayout } from './catalog-stage.utils';

@Component({
  selector: 'app-catalog-stage',
  templateUrl: './catalog-stage.component.html',
  host: { class: 'relative block overflow-hidden', '[style.height.px]': 'layout().height' },
})
export class CatalogStageComponent {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly #document = inject(DOCUMENT);
  readonly #destroyRef = inject(DestroyRef);

  width = input.required<number>();
  height = input.required<number>();
  maxScale = input(4);

  #available = signal(0);

  layout = computed(() =>
    stageLayout(this.#available(), this.width(), this.height(), this.maxScale()),
  );

  constructor() {
    afterNextRender(() => this.#observe());
  }

  #observe(): void {
    const host = this.#host.nativeElement;
    const view = this.#document.defaultView;
    this.#available.set(host.clientWidth);
    if (!view?.ResizeObserver) return;
    const observer = new view.ResizeObserver(() => this.#available.set(host.clientWidth));
    observer.observe(host);
    this.#destroyRef.onDestroy(() => observer.disconnect());
  }
}
