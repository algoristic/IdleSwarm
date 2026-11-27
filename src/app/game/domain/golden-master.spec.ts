import { buyAmount, buyUnit } from './chain-logic';
import {
  GOLDEN_MASTER_NOW,
  GOLDEN_MASTER_SCENARIOS,
  GoldenMasterAction,
  GoldenMasterCheckpoint,
  GoldenMasterEvent,
  GoldenMasterScenario,
  GoldenMasterVariant,
} from './golden-master.fixture';
import { GameConfig } from './models/game-config.model';
import { GameState } from './models/game-state.model';
import { newGame } from './new-game-logic';
import { PROTOTYPE_GAME_CONFIG } from './prototype-game-config.fixture';
import { step } from './step-logic';
import { clearMark, requestLeave, toggleMark } from './travel-logic';
import { buyChainUpgrade, buyUpgrade } from './upgrade-logic';

function configFor(variant: GoldenMasterVariant): GameConfig {
  const base = PROTOTYPE_GAME_CONFIG;
  switch (variant) {
    case 'default':
      return base;
    case 'chainUpgrade':
      return { ...base, chainUpgrade: { ...base.chainUpgrade, enabled: true } };
    case 'edgeCases':
      return {
        ...base,
        map: { ...base.map, initialSites: {} },
        spawn: { ...base.spawn, minTargets: 0 },
        travel: { ...base.travel, base: 1 },
      };
  }
}

function perform(config: GameConfig, state: GameState, action: GoldenMasterAction): unknown {
  switch (action.action) {
    case 'buyUnit': {
      const count = buyAmount(config, state, action.unit, action.mode);
      return { count, result: buyUnit(config, state, action.unit, count) };
    }
    case 'buyUpgrade':
      return buyUpgrade(config, state, action.id);
    case 'buyChainUpgrade':
      return buyChainUpgrade(config, state, action.index);
    case 'toggleMark':
      return toggleMark(config, state, action.kind, action.targetId);
    case 'clearMark':
      return clearMark(state);
    case 'requestLeave':
      return requestLeave(state);
  }
}

function expectedOutcome(action: GoldenMasterAction): unknown {
  return action.action === 'buyUnit'
    ? { count: action.count, result: action.result }
    : action.result;
}

function toCheckpoint(stepIndex: number, state: GameState): GoldenMasterCheckpoint {
  return {
    step: stepIndex,
    time: state.time,
    rngState: state.rngState,
    food: state.food,
    eggs: state.eggs,
    units: state.units,
    zone: state.zone,
    position: state.position,
    siteId: state.siteId,
    siteCount: state.sites.length,
    discoveredCount: state.sites.filter((site) => site.discovered).length,
    stockSum: state.sites.reduce((sum, site) => sum + site.stock, 0),
    findCount: state.finds.length,
    nextId: state.nextId,
    upgradeRanks: state.upgradeRanks,
    chainRanks: state.chainRanks,
    freeUpgrades: state.freeUpgrades,
    buffs: state.buffs,
    mark: state.mark,
    leaveRequested: state.leaveRequested,
    findRespawnAt: state.findRespawnAt,
  };
}

function groupByStep<T extends { step: number }>(items: readonly T[]): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const item of items) groups.set(item.step, [...(groups.get(item.step) ?? []), item]);
  return groups;
}

function replay(scenario: GoldenMasterScenario): void {
  const config = configFor(scenario.variant);
  const state = newGame(config, scenario.seed, GOLDEN_MASTER_NOW);
  const actions = groupByStep(scenario.actions);
  const states = new Map(scenario.states.map((s) => [s.step, s.state]));
  const checkpoints = new Map(scenario.checkpoints.map((c) => [c.step, c]));
  const events = groupByStep(scenario.events);

  const check = (stepIndex: number): void => {
    const checkpoint = checkpoints.get(stepIndex);
    if (checkpoint) {
      expect(toCheckpoint(stepIndex, state), `Prüfpunkt nach ${stepIndex} Schritten`).toStrictEqual(
        checkpoint,
      );
    }
    const full = states.get(stepIndex);
    if (full) expect(state, `Zustand nach ${stepIndex} Schritten`).toStrictEqual(full);
  };

  check(0);
  for (let i = 0; i < scenario.steps; i++) {
    for (const [n, action] of (actions.get(i) ?? []).entries()) {
      expect(perform(config, state, action), `Aktion ${n} vor Schritt ${i}`).toEqual(
        expectedOutcome(action),
      );
    }
    const emitted: GoldenMasterEvent[] = [];
    step(config, state, (event) => emitted.push({ ...event, step: i }));
    expect(emitted, `Ereignisse in Schritt ${i}`).toEqual(events.get(i) ?? []);
    check(i + 1);
  }
}

describe('golden master of the prototype rules', () => {
  it('uses every scenario variant once', () => {
    expect(GOLDEN_MASTER_SCENARIOS.map((s) => s.variant)).toEqual([
      'default',
      'chainUpgrade',
      'edgeCases',
    ]);
  });

  it.each(GOLDEN_MASTER_SCENARIOS.map((s) => [s.name, s] as const))(
    'replays the scenario %s like the prototype',
    (_name, scenario) => {
      replay(scenario);
    },
  );
});
