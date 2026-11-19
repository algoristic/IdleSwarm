import { inject, Injectable, signal } from '@angular/core';

import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import { applyCommand, Command } from '../../domain/commands-logic';
import { createInitialState } from '../../domain/game-state-logic';
import type { GameState } from '../../domain/models/game-state.model';
import { GameEvent, step } from '../../domain/step-logic';
import type { LogEntry } from './game-store-service.model';

/** Obergrenze des Ereignis-Logs; ältere Einträge fallen heraus. */
export const LOG_MAX_ENTRIES = 50;

/** Erzeugt einen zufälligen Seed als Hex-Text; nur der Start eines Spiels nutzt diesen Zufall. */
export function createSeed(): string {
  const words = crypto.getRandomValues(new Uint32Array(2));
  return Array.from(words, (word) => word.toString(16).padStart(8, '0')).join('');
}

export function createNewGame(now: number): GameState {
  return createInitialState({ seed: createSeed(), now });
}

/** Hält den Spielzustand; Änderungen laufen nur über die Methoden dieses Dienstes. */
@Injectable()
export class GameStore {
  readonly #current = signal<GameState>(createNewGame(inject(CLOCK).now()));
  readonly #log = signal<readonly LogEntry[]>([]);
  #nextLogId = 0;

  state = this.#current.asReadonly();
  /** Letzte Ereignisse aus Kommandos und Ticks, älteste zuerst; nur im Arbeitsspeicher. */
  log = this.#log.asReadonly();

  /** Wendet ein Kommando sofort an, nicht erst im nächsten Tick. */
  dispatch(cmd: Command): void {
    const { state, events } = applyCommand(this.#current(), cmd);
    this.#current.set(state);
    this.#appendLog(events);
  }

  /** Schreibt die Simulation fort und gibt die Ereignisse des Schritts zurück. */
  tick(dtMs: number): readonly GameEvent[] {
    const { state, events } = step(this.#current(), dtMs);
    this.#current.set(state);
    this.#appendLog(events);
    return events;
  }

  /**
   * Ersetzt den gesamten Zustand, etwa nach Laden oder Speichern. Das Log leert sich nur, wenn ein
   * anderes Spiel kommt (anderer Seed) oder die Spielzeit zurückspringt: Speichern und Uhrabgleich
   * ersetzen den Zustand ebenfalls und sollen das Log nicht verlieren.
   */
  replace(state: GameState): void {
    const current = this.#current();
    const otherGame = state.seed !== current.seed || state.time.played < current.time.played;
    this.#current.set(state);
    if (otherGame && this.#log().length > 0) {
      this.#log.set([]);
    }
  }

  #appendLog(events: readonly GameEvent[]): void {
    // Die meisten Ticks liefern keine Ereignisse; dann bleibt das Signal unberührt.
    if (events.length === 0) {
      return;
    }
    const added = events.map((event) => ({ id: this.#nextLogId++, event }));
    this.#log.update((log) => [...log, ...added].slice(-LOG_MAX_ENTRIES));
  }
}
