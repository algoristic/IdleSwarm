import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { SaveError } from '@app/persistence/domain/serialize-logic';
import { Num } from '@app/shared/util/num/num';

import type { HudSource } from './hud.model';
import { toHudView, toLogView } from './hud.utils';

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
