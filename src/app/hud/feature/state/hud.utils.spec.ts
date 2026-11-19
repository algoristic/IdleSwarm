import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { stateModifiers } from '@app/engine/domain/modifiers-logic';
import type { Finds } from '@app/finds/domain/models/finds.model';
import { SaveError } from '@app/persistence/domain/serialize-logic';
import { Num } from '@app/shared/util/num/num';
import type { Pheromones } from '@app/swarm/domain/models/pheromones.model';

import type { HudSource } from './hud.model';
import { toFindsView, toHudView, toLogView, toPheromoneView } from './hud.utils';

describe('toHudView', () => {
  const base = createInitialState({ seed: 'hud', now: 0 });

  function view(change: (state: GameState) => GameState = (state) => state, rest = {}) {
    const source: HudSource = {
      state: change(base),
      notice: null,
      lastSaveError: null,
      lastSavedAt: null,
      ...rest,
    };
    return toHudView(source, DEFAULT_BALANCE);
  }

  const unit = (hud: ReturnType<typeof view>, id: string) => hud.units.find((u) => u.id === id);
  const withFood =
    (food: number, droneBought = 1) =>
    (state: GameState) => ({
      ...state,
      res: { ...state.res, food: Num.from(food) },
      bought: { ...state.bought, drones: Num.from(droneBought) },
    });

  it('ordnet die Kaufknöpfe vom ersten Kauf zur teuersten Einheit', () => {
    expect(view().units.map((u) => u.id)).toEqual(['drones', 'soldiers', 'queens']);
  });

  it('rundet den Preis auf', () => {
    const drones = unit(view(withFood(0)), 'drones');
    expect(drones?.affordable).toBe(false);
    expect(drones?.price.toNumber()).toBe(11);
  });

  it('verlangt auf einem kaufbaren Knopf nie mehr, als an Nahrung angezeigt wird', () => {
    const drones = unit(view(withFood(10.8)), 'drones');
    expect(drones?.affordable).toBe(true);
    expect(drones?.price.toNumber()).toBe(10);
  });

  it('zeigt ohne genug Nahrung den aufgerundeten Preis', () => {
    const drones = unit(view(withFood(10.6)), 'drones');
    expect(drones?.affordable).toBe(false);
    expect(drones?.price.toNumber()).toBe(11);
  });

  it('nennt den Effekt nur bei der Königin', () => {
    const hud = view();
    expect(unit(hud, 'queens')?.queenEffect?.eggsPerMin.toNumber()).toBe(6);
    expect(unit(hud, 'queens')?.queenEffect?.space.toNumber()).toBe(10);
    expect(unit(hud, 'drones')?.queenEffect).toBeNull();
  });

  it('füllt den Platzbalken ohne verfügbaren Platz ganz, sobald etwas belegt ist', () => {
    const noQueens = (drones: number) => (state: GameState) => ({
      ...state,
      units: { queens: Num.ZERO, drones: Num.from(drones), soldiers: Num.ZERO },
    });
    expect(view(noQueens(0)).space).toMatchObject({ usagePercent: null, barPercent: 0 });
    expect(view(noQueens(2)).space).toMatchObject({ usagePercent: null, barPercent: 100 });
  });

  it('meldet Überbelegung erst, wenn mehr belegt als verfügbar ist', () => {
    const drones = (count: number) => (state: GameState) => ({
      ...state,
      units: { queens: Num.ONE, drones: Num.from(count), soldiers: Num.ZERO },
    });
    // Platz 10: Bei 10 Drohnen warnt das HUD, überbelegt ist es erst darüber.
    expect(view(drones(10)).space).toMatchObject({ warning: true, overfull: false });
    expect(view(drones(10.5)).space).toMatchObject({ warning: true, overfull: true });
    expect(view(drones(0)).space.overfull).toBe(false);
  });

  it('zeigt die DNA', () => {
    const hud = view((state) => ({ ...state, res: { ...state.res, dna: Num.from(13.55) } }));
    expect(hud.dna.toNumber()).toBe(13.55);
  });

  it('nennt Typ der Futterstelle und ohne Reise keine Reise', () => {
    const hud = view();
    expect(hud.site.type).toBe(base.site.type);
    expect(hud.site.travel).toBeNull();
  });

  it('zeigt während der Reise Ziel und Restdauer in Sekunden', () => {
    const [target] = base.map.candidates;
    const hud = view((state) => ({
      ...state,
      site: { ...state.site, stock: Num.ZERO },
      travel: { target, remainingMs: 24_200 },
    }));
    expect(hud.site.travel?.target).toBe(target.type);
    expect(hud.site.travel?.secondsLeft.toNumber()).toBeCloseTo(24.2);
  });

  it('begrenzt das Opfern auf ganze Drohnen und nennt Ertrag und Verlust (Beispiel 6)', () => {
    const hud = view((state) => ({ ...state, units: { ...state.units, drones: Num.from(10.9) } }));
    expect(hud.sacrifice.maxCount).toBe(10);
    // 10 Drohnen · 0,5 · 10 = 50 Nahrung, 50 % Verlust
    expect(hud.sacrifice.foodPerDrone.mul(10).toNumber()).toBe(50);
    expect(hud.sacrifice.lossPercent).toBe(50);
  });

  it('übernimmt nur gültige Speicherzeitpunkte', () => {
    expect(view(undefined, { lastSavedAt: 1234 }).lastSavedAt).toBe(1234);
    expect(view(undefined, { lastSavedAt: 1e300 }).lastSavedAt).toBeNull();
  });

  it('sammelt Lade- und Speicherhinweise', () => {
    expect(view().notices).toEqual([]);
    expect(
      view(undefined, {
        notice: 'restored-from-backup',
        lastSaveError: new SaveError('storage', 'voll'),
      }).notices,
    ).toEqual(['restored-from-backup', 'save-failed']);
  });
});

describe('toPheromoneView', () => {
  const base = createInitialState({ seed: 'hud', now: 0 });
  const modifiers = stateModifiers(base, DEFAULT_BALANCE);

  function view(pheromones: Partial<Pheromones>, change: Partial<GameState> = {}) {
    const state = { ...base, ...change, pheromones: { ...base.pheromones, ...pheromones } };
    return toPheromoneView(state, DEFAULT_BALANCE, stateModifiers(state, DEFAULT_BALANCE));
  }

  const row = (pheromone: ReturnType<typeof view>, id: string) =>
    pheromone.rows.find((r) => r.id === id);

  it('zeigt die Startverteilung 3 : 1 ohne freie Punkte', () => {
    const pheromones = toPheromoneView(base, DEFAULT_BALANCE, modifiers);
    expect(pheromones).toMatchObject({
      total: 4,
      distributed: 4,
      free: 0,
      dronePercent: 75,
      soldierPercent: 25,
    });
    expect(pheromones.rows.map((r) => r.id)).toEqual(['drones', 'soldiers']);
    expect(row(pheromones, 'drones')).toEqual({
      id: 'drones',
      points: 3,
      increase: null,
      decrease: { drones: 2, soldiers: 1 },
    });
    expect(row(pheromones, 'soldiers')?.decrease).toEqual({ drones: 3, soldiers: 0 });
  });

  it('erlaubt „+“ nur mit freiem Punkt und „−“ nur mit Punkten', () => {
    const free = view({ drones: 3, soldiers: 0 });
    expect(free.free).toBe(1);
    expect(row(free, 'drones')?.increase).toEqual({ drones: 4, soldiers: 0 });
    expect(row(free, 'soldiers')?.increase).toEqual({ drones: 3, soldiers: 1 });
    expect(row(free, 'soldiers')?.decrease).toBeNull();
  });

  it('zählt gekaufte Drüsenpunkte als freie Punkte', () => {
    expect(view({ glands: 2 })).toMatchObject({ total: 6, distributed: 4, free: 2 });
  });

  it('zeigt ohne verteilte Punkte 0 % auf beiden Seiten', () => {
    const empty = view({ drones: 0, soldiers: 0 });
    expect(empty).toMatchObject({ dronePercent: 0, soldierPercent: 0, free: 4 });
    expect(row(empty, 'drones')?.decrease).toBeNull();
  });

  it('rundet die Anteile so, dass sie zusammen 100 % ergeben', () => {
    // 1 / 8 = 12,5 %: einzeln gerundet wären es 13 % und 88 %.
    expect(view({ drones: 1, soldiers: 7, glands: 4 })).toMatchObject({
      dronePercent: 13,
      soldierPercent: 87,
    });
    expect(view({ drones: 1, soldiers: 2, glands: 0 })).toMatchObject({
      dronePercent: 33,
      soldierPercent: 67,
    });
  });

  it('nennt Preis, Bezahlbarkeit und Wirkung der Pheromon-Drüse', () => {
    const food = (amount: number) => ({ res: { ...base.res, food: Num.from(amount) } });
    expect(view({}, food(99.6)).gland).toMatchObject({ affordable: false });
    expect(view({}, food(99.6)).gland.price.toNumber()).toBe(100);
    expect(view({}, food(100)).gland.affordable).toBe(true);
    // Der zweite Drüsenpunkt kostet 100 · 2.
    expect(view({ glands: 1 }, food(150)).gland).toMatchObject({ affordable: false });
    expect(view({ glands: 1 }, food(150)).gland.price.toNumber()).toBe(200);
    // 1 Königin · 6 Eier/min / 4 Startpunkte
    expect(view({}).gland.eggsPerPoint.toNumber()).toBe(1.5);
    const queens = { units: { ...base.units, queens: Num.from(2) } };
    expect(view({}, queens).gland.eggsPerPoint.toNumber()).toBe(3);
  });
});

describe('toFindsView', () => {
  const base = createInitialState({ seed: 'hud', now: 0 });

  function view(finds: Partial<Finds>, played = 0) {
    const state: GameState = {
      ...base,
      time: { ...base.time, played },
      finds: { ...base.finds, ...finds },
    };
    return toFindsView(state, DEFAULT_BALANCE);
  }

  it('zeigt ohne Funde 0 / 24, unbekannte Felder und keine Buffs', () => {
    const finds = view({});
    expect(finds.progress).toEqual({ found: 0, total: 24 });
    expect(finds.sets).toHaveLength(4);
    expect(finds.sets.every((set) => set.fields.every((field) => !field.known))).toBe(true);
    expect(finds.fragments.map((f) => [f.fragment, f.progress.total])).toEqual([
      ['thermophile', 3],
      ['chloroplast', 2],
      ['primal-crystal', 2],
      ['sulfur-pearl', 5],
    ]);
    expect(finds.buffs).toEqual([]);
  });

  it('zählt Sammelobjekte und Fragmente wie im Mockup', () => {
    const finds = view({ collected: { 'sulfur-pearl': 2, 'primal-crystal': 1, pyrite: 1 } });
    expect(finds.progress).toEqual({ found: 4, total: 24 });
    const deep = finds.sets.find((set) => set.id === 'deep-stones');
    expect(deep?.progress).toEqual({ found: 1, total: 3 });
    expect(deep?.fields.find((field) => field.id === 'pyrite')?.known).toBe(true);
    const sulfur = finds.fragments.find((f) => f.fragment === 'sulfur-pearl');
    expect(sulfur?.fields.map((field) => field.known)).toEqual([true, true, false, false, false]);
  });

  it('nennt den Bonus jedes Badges in Prozent und markiert erhaltene Badges', () => {
    const finds = view({ collected: { 'bone-splinter': 1, 'fat-pearl': 1, 'tooth-scale': 1 } });
    const set = (id: string) => finds.sets.find((s) => s.id === id);
    expect(set('mat-relics')).toMatchObject({
      badge: false,
      bonus: { target: 'collectRate', lowers: false },
    });
    expect(set('mat-relics')?.bonus.percent).toBeCloseTo(5);
    expect(set('drift')?.bonus.percent).toBeCloseTo(10);
    expect(set('whale-relics')).toMatchObject({
      badge: true,
      bonus: { target: 'combatLoss', lowers: true },
    });
    expect(set('whale-relics')?.bonus.percent).toBeCloseTo(5);
  });

  it('zeigt nur laufende Buffs mit Restzeit in Spielzeit', () => {
    const finds = view(
      {
        buffs: [
          { id: 'plankton-bloom', expiresAtMs: 100_000 },
          { id: 'warm-current', expiresAtMs: 10_000 },
        ],
      },
      10_000,
    );
    expect(finds.buffs.map((buff) => buff.id)).toEqual(['plankton-bloom']);
    expect(finds.buffs[0].secondsLeft.toNumber()).toBe(90);
  });
});

describe('Zähler am Genom-Link', () => {
  const base = createInitialState({ seed: 'hud', now: 0 });
  const withDna = (dna: number) =>
    toHudView(
      {
        state: { ...base, res: { ...base.res, dna: Num.from(dna) } },
        notice: null,
        lastSaveError: null,
        lastSavedAt: null,
      },
      DEFAULT_BALANCE,
    ).availableAdaptations;

  it('zählt die bezahlbaren Adaptionen', () => {
    expect(withDna(7)).toBe(0);
    // Mit 8 DNA sind die drei Knoten der Stufe 1 bezahlbar.
    expect(withDna(8)).toBe(3);
  });
});

describe('toLogView', () => {
  it('zeigt die neuesten Einträge zuerst, ohne die Eingabe zu ändern', () => {
    const event = (playedMs: number) =>
      ({ type: 'siteDepleted', playedMs, siteType: 'vent' }) as const;
    const log = [
      { id: 0, event: event(1) },
      { id: 1, event: event(2) },
    ];
    expect(toLogView(log).map((entry) => entry.id)).toEqual([1, 0]);
    expect(log.map((entry) => entry.id)).toEqual([0, 1]);
  });
});
