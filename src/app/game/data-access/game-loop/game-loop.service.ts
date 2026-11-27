import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import {
  catchUpSteps,
  mergeCatchUpSummaries,
  needsCatchUp,
  showsCatchUpSummary,
} from '../../domain/catch-up-logic';
import { advanceClock, isSaveDue } from '../../domain/loop-logic';
import { CatchUpSummary } from '../../domain/models/catch-up.model';
import { CatchUpResult } from '../catch-up/catch-up-service.model';
import { CatchUpService } from '../catch-up/catch-up.service';
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
  readonly #catchUpService = inject(CatchUpService);
  readonly #destroyRef = inject(DestroyRef);

  readonly #tempo = signal(1);
  readonly #catchUpSummary = signal<CatchUpSummary | null>(null);
  readonly #catchUpFailed = signal(false);
  #running = false;
  #booted = false;
  #paused = false;
  #frameHandle = 0;
  #last = 0;
  #accumulator = 0;
  #sinceSave = 0;
  #hiddenAt: number | null = null;
  #unregister: (() => void)[] = [];
  #catchingUp = false;
  #pendingCatchUpSeconds = 0;
  #session = 0;

  tempo = this.#tempo.asReadonly();
  catchUpSummary = this.#catchUpSummary.asReadonly();
  catchUpFailed = this.#catchUpFailed.asReadonly();
  catchUpProgress = this.#catchUpService.progress;

  constructor() {
    this.#destroyRef.onDestroy(() => this.stop());
  }

  setTempo(tempo: number): void {
    this.#tempo.set(tempo);
  }

  dismissCatchUpSummary(): void {
    this.#catchUpSummary.set(null);
  }

  dismissCatchUpFailure(): void {
    this.#catchUpFailed.set(false);
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
    this.#session++;
    this.#pendingCatchUpSeconds = 0;
    this.#catchUpService.cancel();
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
    if (!this.#paused && !this.#catchingUp) {
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
    if (needsCatchUp(hiddenSeconds)) this.#catchUp(hiddenSeconds);
  }

  #catchUp(seconds: number): void {
    if (this.#catchingUp) {
      this.#pendingCatchUpSeconds += seconds;
      return;
    }
    if (catchUpSteps(this.#config, seconds) <= 0) return;
    this.#pendingCatchUpSeconds = seconds;
    this.#catchingUp = true;
    this.#store.beginCatchUp();
    void this.#drainCatchUps();
  }

  async #drainCatchUps(): Promise<void> {
    try {
      while (this.#running && this.#pendingCatchUpSeconds > 0) {
        const seconds = this.#pendingCatchUpSeconds;
        const session = this.#session;
        const requestedAt = this.#wallNow();
        this.#pendingCatchUpSeconds = 0;
        const result = await this.#runCatchUp(seconds);
        if (result === 'failed') {
          if (session === this.#session) this.#catchUpFailed.set(true);
          break;
        }
        if (!result || session !== this.#session) continue;
        this.#store.applyCatchUp({ ...result.state, savedAt: requestedAt });
        if (result.summary) this.#showSummary(result.summary);
      }
    } finally {
      this.#pendingCatchUpSeconds = 0;
      this.#store.endCatchUp();
      this.#catchingUp = false;
      this.#last = this.#monotonicNow();
    }
  }

  async #runCatchUp(seconds: number): Promise<CatchUpResult | null | 'failed'> {
    try {
      return await this.#catchUpService.run(this.#config, this.#store.state(), seconds);
    } catch {
      return 'failed';
    }
  }

  #showSummary(summary: CatchUpSummary): void {
    const shown = this.#catchUpSummary();
    const merged = shown ? mergeCatchUpSummaries(shown, summary) : summary;
    if (showsCatchUpSummary(merged)) this.#catchUpSummary.set(merged);
  }
}
