import { inject, Injectable, signal } from '@angular/core';

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

  state = this.#state.asReadonly();
  events = this.#events.asReadonly();
  loadOutcome = this.#loadOutcome.asReadonly();

  advance(steps: number): void {
    if (steps <= 0) return;
    const events: GameEvent[] = [];
    const collect = (event: GameEvent): void => {
      events.push(event);
    };
    for (let i = 0; i < steps; i++) step(this.#config, this.#game, collect);
    this.#record(events);
    this.#publish();
  }

  replace(state: GameState): void {
    this.#game = structuredClone(state);
    this.#events.set([]);
    this.#publish();
  }

  newGame(): void {
    this.replace(this.#saveService.createGame());
    this.save();
  }

  save(): void {
    this.#saveService.save(this.#game);
    this.#publish();
  }

  buyUnit(unit: number, mode: BuyMode): boolean {
    return this.#act((game) =>
      buyUnit(this.#config, game, unit, buyAmount(this.#config, game, unit, mode)),
    );
  }

  buyUpgrade(id: UpgradeId): UpgradePurchase {
    return this.#act((game) => buyUpgrade(this.#config, game, id));
  }

  buyChainUpgrade(index: number): ChainUpgradePurchase {
    return this.#act((game) => buyChainUpgrade(this.#config, game, index));
  }

  toggleMark(kind: TargetKind, targetId: number): MarkResult {
    return this.#act((game) => toggleMark(this.#config, game, kind, targetId));
  }

  clearMark(): boolean {
    return this.#act((game) => clearMark(game));
  }

  requestLeave(): boolean {
    return this.#act((game) => requestLeave(game));
  }

  markEndSeen(): void {
    this.#act((game) => {
      game.endSeen = true;
    });
  }

  #act<T>(action: (game: GameState) => T): T {
    const result = action(this.#game);
    this.#publish();
    return result;
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
