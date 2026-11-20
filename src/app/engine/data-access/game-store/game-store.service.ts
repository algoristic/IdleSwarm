import { inject, Injectable, signal } from '@angular/core';

import { CLOCK } from '@app/shared/data-access/platform/platform.tokens';

import {
  catchUp,
  CatchUpSource,
  CatchUpSummary,
  isReturnSummaryDue,
  mergeCatchUpSummaries,
} from '../../domain/catch-up-logic';
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
  readonly #lastCatchUp = signal<CatchUpSummary | null>(null);
  #nextLogId = 0;

  state = this.#current.asReadonly();
  /** Letzte Ereignisse aus Kommandos und Ticks, älteste zuerst; nur im Arbeitsspeicher. */
  log = this.#log.asReadonly();
  /**
   * Zusammenfassung des Nachholens seit dem letzten Quittieren (Laden, verborgener Tab); `null`
   * ohne Nachholen. Ob sie gezeigt wird, entscheidet `isReturnSummaryDue`.
   */
  lastCatchUp = this.#lastCatchUp.asReadonly();

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
   * Holt `elapsedMs` in groben Schritten nach (`catchUp`, höchstens `T_max`); die Ereignisse
   * landen im Log. Den Uhrabgleich übernimmt der Aufrufer über {@link replace}.
   */
  catchUp(elapsedMs: number, source: CatchUpSource): CatchUpSummary {
    const { state, events, summary } = catchUp(this.#current(), elapsedMs, source);
    this.#current.set(state);
    this.#appendLog(events);
    this.#lastCatchUp.update((previous) => {
      if (previous === null) {
        return summary;
      }
      // Eine offene Rückkehr-Zusammenfassung geht nicht verloren, weil kurz danach nachgeholt wird.
      return isReturnSummaryDue(previous) ? mergeCatchUpSummaries(previous, summary) : summary;
    });
    return summary;
  }

  /** Quittiert die Zusammenfassung des Nachholens. */
  acknowledgeCatchUp(): void {
    this.#lastCatchUp.set(null);
  }

  /**
   * Setzt ein anderes Spiel ein (geladener Stand oder neues Spiel), leert das Log und verwirft die
   * Zusammenfassung des Nachholens. Die Log-IDs zählen weiter, damit `track` keine alten Einträge
   * wiedererkennt.
   */
  load(state: GameState): void {
    this.#current.set(state);
    this.#lastCatchUp.set(null);
    if (this.#log().length > 0) {
      this.#log.set([]);
    }
  }

  /** Ersetzt den Zustand desselben Spiels, etwa nach Speichern oder Uhrabgleich; das Log bleibt. */
  replace(state: GameState): void {
    this.#current.set(state);
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
