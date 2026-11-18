import { BalanceParams, DEFAULT_BALANCE } from '../../balance/constants';
import { Num } from '../../num/num';
import type { Command } from '../../rules/commands';
import { createInitialState, GameState } from '../../state/game-state';
import { createActiveBot } from './active';
import { Bot, createBotView } from './bot';
import { createIdleBot, IDLE_VISIT_EVERY_MS } from './idle';

function setup(
  overrides: Partial<BalanceParams> = {},
  patch: (state: GameState) => GameState = (state) => state,
) {
  const params = { ...DEFAULT_BALANCE, ...overrides };
  const state = patch(createInitialState({ seed: 'bots', now: 0 }, params));
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

const emptySite = (state: GameState): GameState => ({
  ...state,
  site: { ...state.site, stock: Num.ZERO },
});

describe('createActiveBot', () => {
  it('heißt active', () => {
    expect(createActiveBot().name).toBe('active');
  });

  it('verteilt standardmäßig 3 Klicks je Sekunde auf ganze Millisekunden', () => {
    expect(actionTimes(createActiveBot(), 2000)).toEqual([333, 667, 1000, 1333, 1667, 2000]);
  });

  it.each([
    [3, 30],
    [2, 20],
    [0.5, 5],
    [0, 0],
  ])('klickt bei %d Klicks/s in 10 s genau %d-mal', (clicksPerSecond, expected) => {
    const bot = createActiveBot({ clicksPerSecond });
    const { decide } = setup();
    const clicks = actionTimes(bot, 10_000)
      .flatMap((time) => decide(bot, time))
      .filter((command) => command.type === 'click');
    expect(clicks).toHaveLength(expected);
  });

  it('entscheidet nur im eingestellten Abstand', () => {
    const bot = createActiveBot({ clicksPerSecond: 0, decideEveryMs: 2500 });
    expect(actionTimes(bot, 5000)).toEqual([2500, 5000]);
    const { decide } = setup({ startFood: 100 });
    expect(decide(bot, 2500)).toContainEqual({ type: 'buy', unit: 'drones' });
  });

  it('kauft zwischen den Entscheidungen nichts', () => {
    const { decide } = setup({ startFood: 1000 });
    expect(decide(createActiveBot(), 333)).toEqual([{ type: 'click' }]);
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
    const commands = decide(createActiveBot({ clicksPerSecond: 0 }), 0);
    expect(commands).toEqual([{ type: 'buy', unit: 'drones' }]);
  });

  it('kauft keine Soldaten', () => {
    const { decide } = setup({ startFood: 1e6 });
    expect(decide(createActiveBot(), 0)).not.toContainEqual({ type: 'buy', unit: 'soldiers' });
  });

  it('löst bei leerem Vorrat eine neue Futterstelle aus', () => {
    const { decide } = setup({}, emptySite);
    expect(decide(createActiveBot(), 1000)).toContainEqual({ type: 'newSite' });
  });

  it('erneuert auch, wenn der Klick derselben Entscheidung den Vorrat leert', () => {
    const lastFood = (state: GameState): GameState => ({
      ...state,
      site: { ...state.site, stock: Num.ONE },
    });
    const commands = setup({}, lastFood).decide(createActiveBot(), 1000);
    expect(commands.slice(0, 2)).toEqual([{ type: 'click' }, { type: 'newSite' }]);
  });

  it('lehnt ungültige Optionen ab', () => {
    expect(() => createActiveBot({ clicksPerSecond: -1 })).toThrow(RangeError);
    expect(() => createActiveBot({ clicksPerSecond: 1001 })).toThrow(RangeError);
    expect(() => createActiveBot({ decideEveryMs: 0 })).toThrow(RangeError);
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

  it('kauft alles Bezahlbare, Königin vor Drohne, und klickt nie', () => {
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

  it('löst bei leerem Vorrat eine neue Futterstelle aus', () => {
    const commands = setup({ startFood: 0 }, emptySite).decide(createIdleBot(), 0);
    expect(commands).toEqual([{ type: 'newSite' }]);
  });

  it('bleibt bei Preis 0 endlich', () => {
    const commands = setup({ queenCost: 0, droneCost: 0 }).decide(createIdleBot(), 0);
    expect(commands).toHaveLength(1000);
  });

  it('lehnt einen ungültigen Abstand ab', () => {
    expect(() => createIdleBot({ visitEveryMs: 0 })).toThrow(RangeError);
  });
});
