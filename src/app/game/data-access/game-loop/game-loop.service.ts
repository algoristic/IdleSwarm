import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import { advanceClock, isSaveDue } from '../../domain/loop-logic';
import { WALL_CLOCK_NOW } from '../game-save/game-save-service.tokens';
import { GAME_CONFIG } from '../game-store/game-store-service.tokens';
import { GameStoreService } from '../game-store/game-store.service';
import { FRAME_SCHEDULER, MONOTONIC_NOW, PAGE_VISIBILITY } from './game-loop-service.tokens';

@Injectable()
export class GameLoopService {
  readonly #store = inject(GameStoreService);
  readonly #config = inject(GAME_CONFIG);
  readonly #frames = inject(FRAME_SCHEDULER);
  readonly #monotonicNow = inject(MONOTONIC_NOW);
  readonly #wallNow = inject(WALL_CLOCK_NOW);
  readonly #visibility = inject(PAGE_VISIBILITY);

  readonly #tempo = signal(1);
  #running = false;
  #booted = false;
  #paused = false;
  #frameHandle = 0;
  #last = 0;
  #accumulator = 0;
  #sinceSave = 0;
  #hiddenAt: number | null = null;
  #unregister: (() => void)[] = [];

  tempo = this.#tempo.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  setTempo(tempo: number): void {
    this.#tempo.set(tempo);
  }

  start(): void {
    if (this.#running) return;
    this.#running = true;
    if (this.#booted) this.#catchUpSinceSave();
    else this.#boot();
    this.#unregister = [
      this.#visibility.onVisibilityChange(() => this.#onVisibilityChange()),
      this.#visibility.onPageHide(() => this.#store.save()),
    ];
    this.#last = this.#monotonicNow();
    this.#frameHandle = this.#frames.request(this.#frame);
  }

  stop(): void {
    if (!this.#running) return;
    this.#running = false;
    this.#frames.cancel(this.#frameHandle);
    for (const unregister of this.#unregister) unregister();
    this.#unregister = [];
    this.#hiddenAt = null;
    this.#store.save();
  }

  pause(): void {
    this.#paused = true;
  }

  resume(): void {
    this.#paused = false;
    this.#last = this.#monotonicNow();
  }

  readonly #frame = (now: number): void => {
    if (!this.#paused) {
      const clock = advanceClock(
        this.#config,
        this.#accumulator,
        (now - this.#last) / 1000,
        this.#tempo(),
      );
      this.#accumulator = clock.accumulator;
      this.#sinceSave += clock.elapsed;
      this.#store.advance(clock.steps);
      if (isSaveDue(this.#config, this.#sinceSave)) {
        this.#sinceSave = 0;
        this.#store.save();
      }
    }
    this.#last = now;
    this.#frameHandle = this.#frames.request(this.#frame);
  };

  #boot(): void {
    this.#booted = true;
    if (this.#store.loadOutcome() === 'loaded') this.#catchUpSinceSave();
    else this.#store.save();
  }

  #catchUpSinceSave(): void {
    const now = this.#wallNow();
    this.#catchUp((now - (this.#store.state().savedAt || now)) / 1000);
  }

  #onVisibilityChange(): void {
    if (this.#visibility.isHidden()) {
      this.#hiddenAt = this.#wallNow();
      this.#store.save();
      return;
    }
    if (this.#hiddenAt === null) return;
    const hiddenSeconds = (this.#wallNow() - this.#hiddenAt) / 1000;
    this.#hiddenAt = null;
    this.#catchUp(hiddenSeconds);
  }

  #catchUp(_seconds: number): void {
    // Einhängestelle für die Nachberechnung (AP 4b)
  }
}
