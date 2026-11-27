import { inject, Injectable } from '@angular/core';

import { GameState } from '../../domain/models/game-state.model';
import { LoadResult } from '../../domain/models/save.model';
import { newGame } from '../../domain/new-game-logic';
import { parseSave, serializeGame } from '../../domain/save-logic';
import { GAME_CONFIG } from '../game-store/game-store-service.tokens';
import { NEW_GAME_SEED, SAVE_STORAGE, WALL_CLOCK_NOW } from './game-save-service.tokens';

export const GAME_SAVE_KEY = 'idleswarm-save';

@Injectable()
export class GameSaveService {
  readonly #config = inject(GAME_CONFIG);
  readonly #storage = inject(SAVE_STORAGE);
  readonly #now = inject(WALL_CLOCK_NOW);
  readonly #seed = inject(NEW_GAME_SEED);

  load(): LoadResult {
    return parseSave(this.#config, this.#read(), this.#seed(), this.#now());
  }

  save(state: GameState): void {
    state.savedAt = this.#now();
    try {
      this.#storage?.setItem(GAME_SAVE_KEY, serializeGame(state));
    } catch {
      // Speicher voll oder gesperrt: wie im Prototyp ohne Rückmeldung weiterspielen
    }
  }

  createGame(): GameState {
    return newGame(this.#config, this.#seed(), this.#now());
  }

  #read(): string | null {
    try {
      return this.#storage?.getItem(GAME_SAVE_KEY) ?? null;
    } catch {
      return null;
    }
  }
}
