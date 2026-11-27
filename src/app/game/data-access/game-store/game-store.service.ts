import { inject, Injectable, signal, untracked } from '@angular/core';

import { buyAmount, buyUnit } from '../../domain/chain-logic';
import { GameEvent } from '../../domain/models/game-event.model';
import { GameState } from '../../domain/models/game-state.model';
import { MarkResult, TargetKind } from '../../domain/models/travel.model';
import { BuyMode } from '../../domain/models/unit.model';
import {
  ChainUpgradePurchase,
  UpgradeId,
  UpgradePurchase,
} from '../../domain/models/upgrade.model';
import { step } from '../../domain/step-logic';
import { clearMark, requestLeave, toggleMark } from '../../domain/travel-logic';
import { buyChainUpgrade, buyUpgrade } from '../../domain/upgrade-logic';
import { GameSaveService } from '../game-save/game-save.service';
import { GameEventEntry } from './game-store-service.model';
import { GAME_CONFIG } from './game-store-service.tokens';

export const GAME_EVENT_LOG_SIZE = 50;

@Injectable()
export class GameStoreService {
  readonly #saveService = inject(GameSaveService);
  readonly #config = inject(GAME_CONFIG);

  readonly #initial = this.#saveService.load();
  #game: GameState = this.#initial.state;
  #nextEventId = 1;
  readonly #state = signal<GameState>(structuredClone(this.#game));
  readonly #events = signal<readonly GameEventEntry[]>([]);
  readonly #loadOutcome = signal(this.#initial.outcome);
  readonly #catchingUp = signal(false);

  state = this.#state.asReadonly();
  events = this.#events.asReadonly();
  loadOutcome = this.#loadOutcome.asReadonly();
  catchingUp = this.#catchingUp.asReadonly();

  advance(steps: number): void {
    if (steps <= 0 || this.#isLocked()) return;
    const events: GameEvent[] = [];
    const collect = (event: GameEvent): void => {
      events.push(event);
    };
    for (let i = 0; i < steps; i++) step(this.#config, this.#game, collect);
    this.#record(events);
    this.#publish();
  }

  replace(state: GameState): boolean {
    if (this.#isLocked()) return false;
    this.#game = structuredClone(state);
    this.#events.set([]);
    this.#publish();
    return true;
  }

  newGame(): boolean {
    if (!this.replace(this.#saveService.createGame())) return false;
    this.save();
    return true;
  }

  save(): void {
    if (this.#isLocked()) return;
    this.#saveService.save(this.#game);
    this.#publish();
  }

  beginCatchUp(): void {
    this.#catchingUp.set(true);
  }

  applyCatchUp(state: GameState): void {
    this.#game = structuredClone(state);
    this.#publish();
  }

  endCatchUp(): void {
    this.#catchingUp.set(false);
  }

  buyUnit(unit: number, mode: BuyMode): boolean | null {
    return this.#act((game) =>
      buyUnit(this.#config, game, unit, buyAmount(this.#config, game, unit, mode)),
    );
  }

  buyUpgrade(id: UpgradeId): UpgradePurchase | null {
    return this.#act((game) => buyUpgrade(this.#config, game, id));
  }

  buyChainUpgrade(index: number): ChainUpgradePurchase | null {
    return this.#act((game) => buyChainUpgrade(this.#config, game, index));
  }

  toggleMark(kind: TargetKind, targetId: number): MarkResult | null {
    return this.#act((game) => toggleMark(this.#config, game, kind, targetId));
  }

  clearMark(): boolean | null {
    return this.#act((game) => clearMark(game));
  }

  requestLeave(): boolean | null {
    return this.#act((game) => requestLeave(game));
  }

  markEndSeen(): void {
    this.#act((game) => {
      game.endSeen = true;
    });
  }

  #act<T>(action: (game: GameState) => T): T | null {
    if (this.#isLocked()) return null;
    const result = action(this.#game);
    this.#publish();
    return result;
  }

  #isLocked(): boolean {
    return untracked(this.#catchingUp);
  }

  #record(events: GameEvent[]): void {
    if (events.length === 0) return;
    const entries = events.map((event) => ({ id: this.#nextEventId++, event }));
    this.#events.update((log) => [...log, ...entries].slice(-GAME_EVENT_LOG_SIZE));
  }

  #publish(): void {
    this.#state.set(structuredClone(this.#game));
  }
}
