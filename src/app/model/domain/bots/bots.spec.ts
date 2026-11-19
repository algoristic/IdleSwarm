import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { Bot, createBotView } from '@app/engine/domain/bot-logic';
import { apply, Command } from '@app/engine/domain/commands-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { runSimulation } from '@app/engine/domain/runner-logic';
import { Num } from '@app/shared/util/num/num';

import { createActiveBot } from './active-bot-logic';
import { createDroneHeavyBot } from './drone-heavy-bot-logic';
import { createIdleBot, IDLE_VISIT_EVERY_MS } from './idle-bot-logic';
import { createSoldierHeavyBot } from './soldier-heavy-bot-logic';

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
    params,
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

/** Zeichnet alle Kommandos eines Bots in einem Lauf auf. */
function recorded(bot: Bot): { bot: Bot; commands: Command[] } {
  const commands: Command[] = [];
  return {
    commands,
    bot: {
      name: bot.name,
      nextActionMs: (afterMs) => bot.nextActionMs(afterMs),
      decide(state, view) {
        const decided = bot.decide(state, view);
        commands.push(...decided);
        return decided;
      },
    },
  };
}

const buys = (unit: string, count: number): Command[] =>
  Array.from({ length: count }, () => ({ type: 'buy', unit }) as Command);

const isSetting = (command: Command): boolean => command.type !== 'buy';

/** Käufe einer Entscheidung; die einmaligen Einstellungen prüft der Block darüber. */
const buysOf = (commands: readonly Command[]): Command[] =>
  commands.filter((command) => !isSetting(command));

describe.each([
  {
    name: 'drone-heavy',
    create: createDroneHeavyBot,
    settings: [
      { type: 'setTransportPriority', priority: 'drones-first' },
      { type: 'setAutoMove', strategy: 'least-resistance' },
      ENABLE_AUTO_MOVE,
    ],
    forbidden: 'soldiers',
  },
  {
    name: 'soldier-heavy',
    create: createSoldierHeavyBot,
    settings: [
      { type: 'setTransportPriority', priority: 'soldiers-first' },
      { type: 'setAutoMove', strategy: 'battle-hardened' },
      ENABLE_AUTO_MOVE,
    ],
    forbidden: 'drones',
  },
])('$name', ({ name, create, settings, forbidden }) => {
  it('heißt wie seine Art und entscheidet wie Aktiv jede Sekunde', () => {
    expect(create().name).toBe(name);
    expect(actionTimes(create(), 3000)).toEqual([1000, 2000, 3000]);
    expect(actionTimes(create({ decideEveryMs: 2500 }), 5000)).toEqual([2500, 5000]);
  });

  it('stellt in einem neuen Spiel Priorität, Strategie und Auto-Weiterziehen ein', () => {
    expect(setup({ startFood: 0 }, autoOff).decide(create(), 0)).toEqual(settings);
  });

  it('setzt die Einstellungen nur einmal', () => {
    const { state, params, decide } = setup({ startFood: 0 }, autoOff);
    const after = decide(create(), 0).reduce(
      (next, command) => apply(next, command, params),
      state,
    );
    expect(create().decide(after, createBotView(after, 1000, params))).toEqual([]);
  });

  it(`kauft keine Einheiten vom Typ ${forbidden}`, () => {
    const { decide } = setup({ startFood: 1e6 });
    expect(decide(create(), 0)).not.toContainEqual({ type: 'buy', unit: forbidden });
  });

  it('setzt in einem Lauf jede Einstellung genau einmal und ist reproduzierbar', () => {
    const run = () => {
      const { bot, commands } = recorded(create());
      const result = runSimulation({
        seed: 'bots',
        bot,
        durationMs: 600_000,
        sampleEveryMs: 60_000,
      });
      return { result, commands };
    };
    const first = run();
    expect(first.commands.filter(isSetting)).toEqual(settings);
    expect(first.result.events).not.toContainEqual(
      expect.objectContaining({ type: 'buy', unit: forbidden }),
    );
    expect(first.result.events.some((event) => event.type === 'buy')).toBe(true);
    expect(run().result).toEqual(first.result);
  });

  it('lehnt einen ungültigen Abstand ab', () => {
    expect(() => create({ decideEveryMs: 0 })).toThrow(RangeError);
  });
});

describe('createDroneHeavyBot', () => {
  it('kauft Drohnen, solange eine Königin nichts bringt', () => {
    // 70 Nahrung: Drohnen zu 10; 10,70; 11,45; 12,25; 13,11 ergeben 57,51, die sechste kostet 14,03.
    expect(buysOf(setup({ startFood: 70 }).decide(createDroneHeavyBot(), 0))).toEqual(
      buys('drones', 5),
    );
  });

  it('wählt die Königin, wenn sie sich schneller amortisiert', () => {
    const { decide } = setup({}, withCounts(50, 30, 0, 100));
    expect(buysOf(decide(createDroneHeavyBot(), 0))[0]).toEqual({ type: 'buy', unit: 'queens' });
  });
});

describe('createSoldierHeavyBot', () => {
  const withSoldiersBought = (count: number, food: number) => (state: GameState) => ({
    ...state,
    res: { ...state.res, food: Num.from(food) },
    bought: { ...state.bought, soldiers: Num.from(count) },
  });

  it('kauft Soldaten, solange sie günstiger sind als die Königin', () => {
    // 100 Nahrung: Soldaten zu 25; 27; 29,16, der vierte kostet 31,49 und ist nicht mehr bezahlbar.
    expect(buysOf(setup({ startFood: 100 }).decide(createSoldierHeavyBot(), 0))).toEqual(
      buys('soldiers', 3),
    );
  });

  it('kauft die Königin, sobald sie günstiger ist als der Soldat', () => {
    // 12 gekaufte Soldaten: der nächste kostet 25 · 1,08¹² ≈ 62,95, die Königin 60, danach 72.
    const { decide } = setup({}, withSoldiersBought(12, 130));
    expect(buysOf(decide(createSoldierHeavyBot(), 0))).toEqual([
      { type: 'buy', unit: 'queens' },
      { type: 'buy', unit: 'soldiers' },
    ]);
  });

  it('spart auf die günstigere Königin, statt einen teureren Soldaten zu kaufen', () => {
    const { decide } = setup({}, withSoldiersBought(12, 59));
    expect(buysOf(decide(createSoldierHeavyBot(), 0))).toEqual([]);
  });

  it('nimmt bei gleichem Preis den Soldaten', () => {
    const { decide } = setup({ startFood: 60, soldierCost: 60 });
    expect(buysOf(decide(createSoldierHeavyBot(), 0))).toEqual([{ type: 'buy', unit: 'soldiers' }]);
  });

  it('bleibt bei Preis 0 endlich', () => {
    const { decide } = setup({ queenCost: 0, soldierCost: 0 });
    const commands = buysOf(decide(createSoldierHeavyBot(), 0));
    expect(commands).toHaveLength(1000);
  });
});
