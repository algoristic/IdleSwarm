import { Injectable, signal } from '@angular/core';

import { apply, Command } from '../core/rules/commands';
import { GameEvent, step } from '../core/sim/step';
import { createInitialState, GameState } from '../core/state/game-state';

/** Erzeugt einen zufälligen Seed als Hex-Text; nur der Start eines Spiels nutzt diesen Zufall. */
export function createSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('');
}

export function createNewGame(now: number = Date.now()): GameState {
  return createInitialState({ seed: createSeed(), now });
}

/** Hält den Spielzustand; Änderungen laufen nur über die Methoden dieses Dienstes. */
@Injectable({ providedIn: 'root' })
export class GameStoreService {
  private readonly current = signal<GameState>(createNewGame());

  readonly state = this.current.asReadonly();

  /** Wendet ein Kommando sofort an, nicht erst im nächsten Tick. */
  dispatch(cmd: Command): void {
    this.current.update((state) => apply(state, cmd));
  }

  /** Schreibt die Simulation fort und gibt die Ereignisse des Schritts zurück. */
  tick(dtMs: number): readonly GameEvent[] {
    const { state, events } = step(this.current(), dtMs);
    this.current.set(state);
    return events;
  }

  /** Ersetzt den gesamten Zustand, etwa nach Laden oder Speichern. */
  replace(state: GameState): void {
    this.current.set(state);
  }
}
