import { harvestHistoryLength } from './harvest-logic';
import { GameConfig } from './models/game-config.model';
import { GameState, SAVE_VERSION } from './models/game-state.model';
import { LoadResult } from './models/save.model';
import { newGame } from './new-game-logic';
import { CHAIN_UPGRADE_COUNT } from './upgrade-logic';

export function serializeGame(state: GameState): string {
  return JSON.stringify(state);
}

export function migrate(config: GameConfig, value: unknown, now: number): GameState | null {
  if (!isRecord(value) || value['version'] !== SAVE_VERSION || !Array.isArray(value['sites']))
    return null;
  const saved = value as Partial<GameState>;
  const base = newGame(config, seedOf(value['seed']), now);
  const state: GameState = { ...base, ...saved };
  state.stats = { ...base.stats, ...partialOf<GameState['stats']>(value['stats']) };
  state.buffs = { ...base.buffs, ...partialOf<GameState['buffs']>(value['buffs']) };
  state.upgradeRanks = {
    ...base.upgradeRanks,
    ...partialOf<GameState['upgradeRanks']>(value['upgradeRanks']),
  };
  const chainRanks: unknown = state.chainRanks;
  if (!Array.isArray(chainRanks) || chainRanks.length !== CHAIN_UPGRADE_COUNT)
    state.chainRanks = base.chainRanks;
  const history: unknown = state.harvestHistory;
  const historyLength = harvestHistoryLength(config);
  if (!Array.isArray(history) || history.length !== historyLength) {
    state.harvestHistory = new Array<number>(historyLength).fill(0);
    state.harvestHistoryIndex = 0;
    state.harvestHistorySum = 0;
  }
  return state;
}

export function parseSave(
  config: GameConfig,
  raw: string | null,
  seed: number,
  now: number,
): LoadResult {
  if (!raw) return { state: newGame(config, seed, now), outcome: 'fresh' };
  try {
    const state = migrate(config, JSON.parse(raw), now);
    if (state) return { state, outcome: 'loaded' };
  } catch {
    // beschädigter Spielstand → reset (ADR 0001)
  }
  return { state: newGame(config, seed, now), outcome: 'reset' };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function seedOf(value: unknown): number {
  return typeof value === 'number' && value ? value : 1;
}

function partialOf<T>(value: unknown): Partial<T> {
  return isRecord(value) ? (value as Partial<T>) : {};
}
