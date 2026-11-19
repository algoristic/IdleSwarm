import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Bot, createBotView } from '@app/engine/domain/bot-logic';
import type { Command } from '@app/engine/domain/commands-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';

import { createActiveBot } from './active-bot-logic';
import { createIdleBot, IDLE_VISIT_EVERY_MS } from './idle-bot-logic';

/**
 * Zustand mit eingeschaltetem Auto-Weiterziehen, damit die Kaufentscheidungen für sich stehen;
 * `autoOff` stellt den Zustand eines neuen Spiels wieder her.
 */
function setup(
  overrides: Partial<BalanceParams> = {},
  patch: (state: GameState) => GameState = (state) => state,
) {
  const params = { ...DEFAULT_BALANCE, ...overrides };
  const initial = createInitialState({ seed: 'bots', now: 0 }, params);
  const state = patch({ ...initial, auto: { ...initial.auto, enabled: true } });
  return {
    state,
    decide: (bot: Bot, timeMs: number): readonly Command[] =>
      bot.decide(state, createBotView(state, timeMs, params)),
  };
}

/** Alle Aktionszeitpunkte eines Bots bis einschließlich `untilMs`, ohne den Start. */
function actionTimes(bot: Bot, untilMs: number): number[] {
  const times: number[] = [];
  for (let time = bot.nextActionMs(0); time <= untilMs; time = bot.nextActionMs(time)) {
    times.push(time);
  }
  return times;
}

function withCounts(drones: number, boughtDrones: number, boughtQueens: number, food: number) {
  return (state: GameState): GameState => ({
    ...state,
    res: { ...state.res, food: Num.from(food) },
    units: { ...state.units, drones: Num.from(drones) },
    bought: {
      ...state.bought,
      drones: Num.from(boughtDrones),
      queens: Num.from(boughtQueens),
    },
  });
}

const autoOff = (state: GameState): GameState => ({
  ...state,
  auto: { ...state.auto, enabled: false },
});

const ENABLE_AUTO_MOVE: Command = { type: 'setAutoMove', enabled: true };

describe('createActiveBot', () => {
  it('heißt active', () => {
    expect(createActiveBot().name).toBe('active');
  });

  it('entscheidet standardmäßig jede Sekunde', () => {
    expect(actionTimes(createActiveBot(), 3000)).toEqual([1000, 2000, 3000]);
  });

  it('entscheidet im eingestellten Abstand', () => {
    const bot = createActiveBot({ decideEveryMs: 2500 });
    expect(actionTimes(bot, 5000)).toEqual([2500, 5000]);
    const { decide } = setup({ startFood: 100 });
    expect(decide(bot, 2500)).toContainEqual({ type: 'buy', unit: 'drones' });
  });

  it('erzeugt bei eingeschaltetem Auto-Weiterziehen nur Käufe', () => {
    const { decide } = setup({ startFood: 1000 });
    const types = new Set(decide(createActiveBot(), 0).map((command) => command.type));
    expect([...types]).toEqual(['buy']);
  });

  it('bevorzugt Drohnen, solange Brut teurer ist als der Kauf', () => {
    // a · Preis = 7,5 liegt unter den Brutkosten 13,75; eine Königin bringt also nichts.
    const { decide } = setup({ startFood: 70 });
    const commands = decide(createActiveBot(), 0);
    expect(commands[0]).toEqual({ type: 'buy', unit: 'drones' });
    expect(commands).not.toContainEqual({ type: 'buy', unit: 'queens' });
  });

  it('wählt die Königin, wenn sie sich schneller amortisiert', () => {
    // Drohne: 76,12 / 0,2 ≈ 381 s. Königin: 60 / (0,1 · (0,75 · 76,12 − 13,75)) ≈ 14 s.
    const { decide } = setup({}, withCounts(50, 30, 0, 100));
    expect(decide(createActiveBot(), 0)[0]).toEqual({ type: 'buy', unit: 'queens' });
  });

  it('spart auf die bessere Königin, statt eine schlechtere Drohne zu kaufen', () => {
    // Königin kostet 149,30 und ist nicht bezahlbar, die Drohne (76,12) schon.
    const { decide } = setup({}, withCounts(50, 30, 5, 100));
    expect(decide(createActiveBot(), 0)).toEqual([]);
  });

  it('kauft keine Königin, deren Brut der Zufluss nicht bezahlt', () => {
    const { decide } = setup({}, withCounts(0, 30, 0, 100));
    const commands = decide(createActiveBot(), 0);
    expect(commands).toEqual([{ type: 'buy', unit: 'drones' }]);
  });

  it('kauft keine Soldaten', () => {
    const { decide } = setup({ startFood: 1e6 });
    expect(decide(createActiveBot(), 0)).not.toContainEqual({ type: 'buy', unit: 'soldiers' });
  });

  it('schaltet in einem neuen Spiel zuerst das Auto-Weiterziehen ein, dann kauft er', () => {
    const commands = setup({ startFood: 100 }, autoOff).decide(createActiveBot(), 0);
    expect(commands[0]).toEqual(ENABLE_AUTO_MOVE);
    expect(commands.slice(1)).toContainEqual({ type: 'buy', unit: 'drones' });
    expect(commands.filter((command) => command.type === 'setAutoMove')).toHaveLength(1);
  });

  it('schaltet das Auto-Weiterziehen auch ohne Nahrung ein', () => {
    const commands = setup({ startFood: 0 }, autoOff).decide(createActiveBot(), 0);
    expect(commands).toEqual([ENABLE_AUTO_MOVE]);
  });

  it.each([0, -1, NaN, Infinity])('lehnt den Abstand %d ab', (decideEveryMs) => {
    expect(() => createActiveBot({ decideEveryMs })).toThrow(RangeError);
  });
});

describe('createIdleBot', () => {
  it('schaut standardmäßig alle 5 Minuten vorbei', () => {
    const bot = createIdleBot();
    expect(bot.name).toBe('idle');
    expect(bot.nextActionMs(0)).toBe(IDLE_VISIT_EVERY_MS);
    expect(bot.nextActionMs(IDLE_VISIT_EVERY_MS)).toBe(2 * IDLE_VISIT_EVERY_MS);
  });

  it('nutzt den eingestellten Abstand', () => {
    expect(createIdleBot({ visitEveryMs: 1000 }).nextActionMs(1500)).toBe(2000);
  });

  it('kauft alles Bezahlbare, Königin vor Drohne', () => {
    // 200 Nahrung: Königinnen zu 60 und 72, danach 68 übrig für Drohnen zu 10 bis 13,11.
    const commands = setup({ startFood: 200 }).decide(createIdleBot(), 0);
    expect(commands).toEqual([
      { type: 'buy', unit: 'queens' },
      { type: 'buy', unit: 'queens' },
      ...Array.from({ length: 5 }, () => ({ type: 'buy', unit: 'drones' })),
    ]);
  });

  it('kauft ohne Nahrung nichts', () => {
    expect(setup({ startFood: 0 }).decide(createIdleBot(), 0)).toEqual([]);
  });

  it('schaltet in einem neuen Spiel zuerst das Auto-Weiterziehen ein, dann kauft er', () => {
    const commands = setup({ startFood: 65 }, autoOff).decide(createIdleBot(), 0);
    expect(commands).toEqual([ENABLE_AUTO_MOVE, { type: 'buy', unit: 'queens' }]);
  });

  it('bleibt bei Preis 0 endlich', () => {
    const commands = setup({ queenCost: 0, droneCost: 0 }).decide(createIdleBot(), 0);
    expect(commands).toHaveLength(1000);
  });

  it('lehnt einen ungültigen Abstand ab', () => {
    expect(() => createIdleBot({ visitEveryMs: 0 })).toThrow(RangeError);
  });
});
