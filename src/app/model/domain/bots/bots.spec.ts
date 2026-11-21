import { BALANCE_V1 } from '@app/balance/domain/balance-v1.testing';
import { BalanceParams } from '@app/balance/domain/constants';
import { Bot, createBotView } from '@app/engine/domain/bot-logic';
import { apply, Command } from '@app/engine/domain/commands-logic';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import { GameState } from '@app/engine/domain/models/game-state.model';
import { runSimulation } from '@app/engine/domain/runner-logic';
import type { GenomeNodeId } from '@app/genome/domain/models/genome.model';
import { Num } from '@app/shared/util/num/num';

import { createActiveBot } from './active-bot-logic';
import { createDroneHeavyBot } from './drone-heavy-bot-logic';
import { createIdleBot, IDLE_VISIT_EVERY_MS } from './idle-bot-logic';
import { closestSplit } from './pheromone-bot-logic';
import { createSoldierHeavyBot } from './soldier-heavy-bot-logic';

/**
 * Zustand mit eingeschaltetem Auto-Weiterziehen, damit die Kaufentscheidungen für sich stehen;
 * `autoOff` stellt den Zustand eines neuen Spiels wieder her.
 */
function setup(
  overrides: Partial<BalanceParams> = {},
  patch: (state: GameState) => GameState = (state) => state,
) {
  const params = { ...BALANCE_V1, ...overrides };
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

/** Einmalige Einstellungen; die Pheromon-Verteilung ändert sich auch mit jedem freien Punkt. */
const isSetting = (command: Command): boolean =>
  command.type === 'setTransportPriority' || command.type === 'setAutoMove';

/** Einheitenkäufe einer Entscheidung; die einmaligen Einstellungen prüft der Block darüber. */
const buysOf = (commands: readonly Command[]): Command[] =>
  commands.filter((command) => command.type === 'buy');

describe.each([
  {
    name: 'drone-heavy',
    create: createDroneHeavyBot,
    settings: [
      { type: 'setTransportPriority', priority: 'drones-first' },
      { type: 'setAutoMove', strategy: 'least-resistance' },
      ENABLE_AUTO_MOVE,
      { type: 'setPheromones', drones: 4, soldiers: 0 },
    ] as Command[],
    forbidden: 'soldiers',
  },
  {
    name: 'soldier-heavy',
    create: createSoldierHeavyBot,
    settings: [
      { type: 'setTransportPriority', priority: 'soldiers-first' },
      { type: 'setAutoMove', strategy: 'battle-hardened' },
      ENABLE_AUTO_MOVE,
      { type: 'setPheromones', drones: 2, soldiers: 2 },
    ] as Command[],
    forbidden: 'drones',
  },
])('$name', ({ name, create, settings, forbidden }) => {
  it('heißt wie seine Art und entscheidet wie Aktiv jede Sekunde', () => {
    expect(create().name).toBe(name);
    expect(actionTimes(create(), 3000)).toEqual([1000, 2000, 3000]);
    expect(actionTimes(create({ decideEveryMs: 2500 }), 5000)).toEqual([2500, 5000]);
  });

  it('stellt in einem neuen Spiel Priorität, Strategie, Auto-Weiterziehen und Verteilung ein', () => {
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
        params: BALANCE_V1,
      });
      return { result, commands };
    };
    const first = run();
    expect(first.commands.filter(isSetting)).toEqual(settings.filter(isSetting));
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

/** Alle vier Bots mit Zielanteil `a*` und Startverteilung (Game-Design §6.3). */
const ALL_BOTS = [
  { name: 'active', create: () => createActiveBot(), start: [3, 1] },
  { name: 'idle', create: () => createIdleBot(), start: [3, 1] },
  { name: 'drone-heavy', create: () => createDroneHeavyBot(), start: [4, 0] },
  { name: 'soldier-heavy', create: () => createSoldierHeavyBot(), start: [2, 2] },
] as const;

const withPheromones =
  (drones: number, soldiers: number, glands: number) =>
  (state: GameState): GameState => ({ ...state, pheromones: { drones, soldiers, glands } });

const withGenome =
  (dna: number, owned: readonly GenomeNodeId[] = []) =>
  (state: GameState): GameState => ({
    ...state,
    res: { ...state.res, dna: Num.from(dna) },
    genome: { owned },
  });

/** Käufe in Nahrung: Einheiten und Drüsenpunkte, ohne Einstellungen und Verteilung. */
const purchasesOf = (commands: readonly Command[]): Command[] =>
  commands.filter((command) => command.type === 'buy' || command.type === 'strengthenGland');

const evolved = (commands: readonly Command[]): GenomeNodeId[] =>
  commands.flatMap((command) => (command.type === 'evolve' ? [command.node] : []));

const pheromoneCommands = (commands: readonly Command[]): Command[] =>
  commands.filter((command) => command.type === 'setPheromones');

const COLLECT_AND_BROOD: readonly GenomeNodeId[] = [
  'cilia-1',
  'cilia-2',
  'filter-feeder',
  'chemotaxis',
  'flagellum',
  'yolk-reserve',
  'brood-combs',
  'second-gland',
  'nurse-cells',
  'budding',
];

describe('closestSplit', () => {
  it.each([
    [4, 3 / 4, 3, 1],
    [4, 1, 4, 0],
    [4, 1 / 2, 2, 2],
    [5, 3 / 4, 4, 1],
    // Gleichstand: 4,5 bzw. 2,5 Drohnenpunkte, also mehr Drohnen.
    [6, 3 / 4, 5, 1],
    [5, 1 / 2, 3, 2],
    [7, 3 / 4, 5, 2],
    [0, 3 / 4, 0, 0],
  ])('teilt %d Punkte bei a* = %d in %d : %d', (points, share, drones, soldiers) => {
    expect(closestSplit(points, share)).toEqual({ drones, soldiers });
  });
});

describe('Pheromon-Verteilung der Bots', () => {
  it.each(ALL_BOTS)('$name setzt in einem neuen Spiel die Startverteilung', ({ create, start }) => {
    const commands = setup({ startFood: 0 }, autoOff).decide(create(), 0);
    const [drones, soldiers] = start;
    const expected =
      drones === 3 && soldiers === 1 ? [] : [{ type: 'setPheromones', drones, soldiers }];
    expect(pheromoneCommands(commands)).toEqual(expected);
  });

  it.each([
    ['active', createActiveBot, 3, 1, 4, 1],
    ['idle', createIdleBot, 3, 1, 4, 1],
    ['drone-heavy', createDroneHeavyBot, 4, 0, 5, 0],
    // |3 − 2,5| = |2 − 2,5|: Gleichstand, also auf Drohnen.
    ['soldier-heavy', createSoldierHeavyBot, 2, 2, 3, 2],
  ])('%s verteilt einen freien Punkt sofort', (_name, create, drones, soldiers, toD, toS) => {
    const { decide } = setup({ startFood: 0 }, withPheromones(drones, soldiers, 1));
    expect(pheromoneCommands(decide(create(), 0))).toEqual([
      { type: 'setPheromones', drones: toD, soldiers: toS },
    ]);
  });

  it('verteilt mehrere freie Punkte einzeln', () => {
    // 3 : 1 → 4 : 1 (0,8 statt 0,6) → 5 : 1 (|5 − 4,5| = |4 − 4,5|, Gleichstand: Drohnen).
    const { decide } = setup({ startFood: 0 }, withPheromones(3, 1, 2));
    expect(pheromoneCommands(decide(createActiveBot(), 0))).toEqual([
      { type: 'setPheromones', drones: 5, soldiers: 1 },
    ]);
  });

  it('verteilt auch den Punkt der Zweiten Drüse', () => {
    const owned: GenomeNodeId[] = ['yolk-reserve', 'brood-combs', 'second-gland'];
    const { decide } = setup({ startFood: 0 }, withGenome(0, owned));
    expect(pheromoneCommands(decide(createActiveBot(), 0))).toEqual([
      { type: 'setPheromones', drones: 4, soldiers: 1 },
    ]);
  });

  it('setzt ohne freien Punkt nichts', () => {
    const { decide } = setup({ startFood: 0 }, withPheromones(4, 1, 1));
    expect(decide(createActiveBot(), 0)).toEqual([]);
  });
});

describe('Genom der Bots', () => {
  it('entwickelt den günstigsten Knoten, bei gleichen Kosten nach der Ast-Reihenfolge', () => {
    const { decide } = setup({ startFood: 0 }, withGenome(16));
    expect(evolved(decide(createActiveBot(), 0))).toEqual(['cilia-1', 'yolk-reserve']);
  });

  it.each([
    ['idle', createIdleBot, ['cilia-1', 'yolk-reserve', 'acid-vacuole']],
    ['drone-heavy', createDroneHeavyBot, ['cilia-1', 'yolk-reserve']],
    ['soldier-heavy', createSoldierHeavyBot, ['acid-vacuole', 'yolk-reserve']],
  ])('%s entwickelt nach seinen bevorzugten Ästen', (_name, create, nodes) => {
    // 24 DNA reichen für drei Knoten der ersten Stufe (je 8). Sind die bevorzugten Äste nicht voll,
    // spart der Bot danach auf deren nächste Stufe (25) und lässt die übrigen liegen.
    const { decide } = setup({ startFood: 0 }, withGenome(24));
    expect(evolved(decide(create(), 0))).toEqual(nodes);
  });

  it('kauft bei genug DNA auch die nächste Stufe', () => {
    const owned: GenomeNodeId[] = ['cilia-1', 'yolk-reserve', 'acid-vacuole'];
    const { decide } = setup({ startFood: 0 }, withGenome(50, owned));
    expect(evolved(decide(createActiveBot(), 0))).toEqual(['cilia-2', 'brood-combs']);
  });

  it('spart auf den günstigsten Knoten der bevorzugten Äste', () => {
    // Drohnen-lastig: Cilien-Schlag II und Brutwaben kosten 25; die bezahlbare Säurevakuole (8)
    // liegt im Kampf-Ast und bleibt liegen.
    const { decide } = setup({ startFood: 0 }, withGenome(24, ['cilia-1', 'yolk-reserve']));
    expect(evolved(decide(createDroneHeavyBot(), 0))).toEqual([]);
  });

  it('spart auch, wenn nur der nächste Knoten zu teuer ist', () => {
    const owned: GenomeNodeId[] = ['cilia-1', 'yolk-reserve', 'acid-vacuole'];
    const { decide } = setup({ startFood: 0 }, withGenome(24, owned));
    expect(decide(createActiveBot(), 0)).toEqual([]);
  });

  it('nimmt die übrigen Äste, wenn die bevorzugten voll sind', () => {
    const { decide } = setup({ startFood: 0 }, withGenome(8, COLLECT_AND_BROOD));
    expect(evolved(decide(createDroneHeavyBot(), 0))).toEqual(['acid-vacuole']);
  });

  it('entwickelt ohne DNA nichts', () => {
    expect(evolved(setup({ startFood: 0 }).decide(createActiveBot(), 0))).toEqual([]);
  });

  it('lässt die Nahrungskäufe unberührt', () => {
    // Säurevakuole ändert nur den Angriff, die Kaufentscheidung bleibt also gleich.
    const food = setup({ startFood: 300 });
    const both = setup({ startFood: 300 }, withGenome(8));
    const bot = createSoldierHeavyBot();
    expect(evolved(both.decide(bot, 0))).toEqual(['acid-vacuole']);
    expect(buysOf(both.decide(bot, 0))).toEqual(buysOf(food.decide(bot, 0)));
  });
});

describe('Drüsenpunkt der Bots', () => {
  /** Zehn Königinnen, Drohnen für Zufluss; die nächste Königin kostet 60 · 1,2⁹ ≈ 309,6. */
  const tenQueens =
    (food: number) =>
    (state: GameState): GameState => ({
      ...withCounts(500, 30, 9, food)(state),
      units: { ...state.units, queens: Num.from(10), drones: Num.from(500) },
    });

  it.each([
    ['active', createActiveBot, 4, 1],
    ['drone-heavy', createDroneHeavyBot, 5, 0],
  ])('%s kauft den Drüsenpunkt als dritte Option der Amortisation', (_n, create, toD, toS) => {
    // Drüse: 100 / (10/4 · Ertrag einer Königin) schlägt Königin (309,6) und Drohne (76,12 / 0,2).
    const commands = setup({}, tenQueens(100)).decide(create(), 0);
    expect(purchasesOf(commands)[0]).toEqual({ type: 'strengthenGland' });
    expect(pheromoneCommands(commands)).toEqual([
      { type: 'setPheromones', drones: toD, soldiers: toS },
    ]);
  });

  it('spart auf den Drüsenpunkt, statt eine schlechtere Drohne zu kaufen', () => {
    // 99 Nahrung: Die Drohne (76,12) wäre bezahlbar, der bessere Drüsenpunkt (100) nicht.
    const { decide } = setup({}, tenQueens(99));
    expect(decide(createActiveBot(), 0)).toEqual([]);
  });

  it('wählt bei wenigen Königinnen weiter die Königin', () => {
    // Eine Königin: Der Drüsenpunkt bringt ein Viertel ihres Ertrags und kostet mehr.
    const { decide } = setup({}, withCounts(50, 30, 0, 100));
    expect(decide(createActiveBot(), 0)[0]).toEqual({ type: 'buy', unit: 'queens' });
  });

  it('idle kauft Drüsenpunkte nach den Königinnen und vor den Drohnen', () => {
    // 200 Nahrung: Königinnen zu 60 und 72, Drüse zu 50 (die nächste kostet 100), Drohne zu 10.
    const commands = setup({ startFood: 200, glandCost: 50 }).decide(createIdleBot(), 0);
    expect(commands).toEqual([
      { type: 'buy', unit: 'queens' },
      { type: 'buy', unit: 'queens' },
      { type: 'strengthenGland' },
      { type: 'buy', unit: 'drones' },
      { type: 'setPheromones', drones: 4, soldiers: 1 },
    ]);
  });

  it('idle kauft alle bezahlbaren Drüsenpunkte', () => {
    // Ohne Königin und Drohne (Preis über der Nahrung): Drüsen zu 10, 20, 40 = 70.
    const params = { startFood: 100, glandCost: 10, queenCost: 1000, droneCost: 1000 };
    const commands = setup(params).decide(createIdleBot(), 0);
    expect(commands.filter((command) => command.type === 'strengthenGland')).toHaveLength(3);
    // 3 : 1 → 4 : 1 → 5 : 1 → 5 : 2.
    expect(pheromoneCommands(commands)).toEqual([
      { type: 'setPheromones', drones: 5, soldiers: 2 },
    ]);
  });

  /** Gekaufte Soldaten und Königinnen; Soldat 25 · 1,08ⁿ, Königin 60 · 1,2ⁿ. */
  const soldierHeavyPrices =
    (soldiers: number, queens: number, food: number) =>
    (state: GameState): GameState => ({
      ...state,
      res: { ...state.res, food: Num.from(food) },
      bought: { ...state.bought, soldiers: Num.from(soldiers), queens: Num.from(queens) },
    });

  it('soldier-heavy kauft den Drüsenpunkt, wenn er die günstigste Option ist', () => {
    // Soldat 25 · 1,08¹⁹ ≈ 107,9, Königin 60 · 1,2⁴ ≈ 124,4, Drüse 100.
    // Die erste Entscheidung setzt 2 : 2, der neue Punkt geht bei Gleichstand auf Drohnen.
    const commands = setup({}, soldierHeavyPrices(19, 4, 100)).decide(createSoldierHeavyBot(), 0);
    expect(purchasesOf(commands)).toEqual([{ type: 'strengthenGland' }]);
    expect(pheromoneCommands(commands)).toEqual([
      { type: 'setPheromones', drones: 3, soldiers: 2 },
    ]);
  });

  it('soldier-heavy spart auf den günstigeren Drüsenpunkt', () => {
    const { decide } = setup({}, soldierHeavyPrices(19, 4, 99));
    expect(purchasesOf(decide(createSoldierHeavyBot(), 0))).toEqual([]);
  });

  it.each([
    [
      'Soldat vor Königin und Drüse',
      { soldierCost: 60, glandCost: 60 },
      { type: 'buy', unit: 'soldiers' },
    ],
    ['Königin vor Drüse', { soldierCost: 200, glandCost: 60 }, { type: 'buy', unit: 'queens' }],
  ])('soldier-heavy nimmt bei gleichem Preis %s', (_name, overrides, expected) => {
    const { decide } = setup({ startFood: 60, ...overrides });
    expect(purchasesOf(decide(createSoldierHeavyBot(), 0))[0]).toEqual(expected);
  });
});

describe('Bots über eine Stunde', () => {
  it.each(ALL_BOTS)('$name ist reproduzierbar und nutzt Genom und Drüse', ({ create }) => {
    const run = () => {
      const { bot, commands } = recorded(create());
      const result = runSimulation({
        seed: 'modell',
        bot,
        durationMs: 3_600_000,
        sampleEveryMs: 60_000,
        params: BALANCE_V1,
      });
      return { result, commands };
    };
    const first = run();
    const types = new Set(first.commands.map((command) => command.type));
    expect(types).toContain('strengthenGland');
    expect(types).toContain('setPheromones');
    expect(first.result.events.some((event) => event.type === 'evolved')).toBe(true);
    const second = run();
    expect(second.result).toEqual(first.result);
    expect(second.commands).toEqual(first.commands);
  });
});
