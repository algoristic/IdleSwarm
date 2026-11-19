import { Num } from '@app/shared/util/num/num';
import type { Units } from '@app/swarm/domain/models/units.model';

import { DEFAULT_BALANCE } from './constants';
import {
  combineEffects,
  effectValue,
  isValidEffect,
  modifierFactor,
  NEUTRAL_MODIFIERS,
} from './effects-logic';
import {
  attackPerSoldier,
  dronesPerQueen,
  expectedLosses,
  foodPerSecond,
  isCapturable,
  recycledFood,
  sacrificeLossShare,
  sacrificeYieldShare,
  siteFindChance,
  soldierAttack,
  spaceAvailable,
  spacePerQueen,
  swarmRange,
} from './formulas';
import type { Effect } from './models/effect.model';

function units(queens: number, drones: number, soldiers: number): Units {
  return { queens: Num.from(queens), drones: Num.from(drones), soldiers: Num.from(soldiers) };
}

const add = (target: Effect['target'], value: number): Effect =>
  ({ target, op: 'add', value }) as Effect;
const mul = (target: Effect['target'], value: number): Effect =>
  ({ target, op: 'mul', value }) as Effect;

describe('combineEffects (Game-Design §4.13, Verrechnung)', () => {
  it('liefert ohne Effekte die neutralen Modifikatoren', () => {
    expect(combineEffects([], 'vent')).toBe(NEUTRAL_MODIFIERS);
    expect(combineEffects([], null)).toBe(NEUTRAL_MODIFIERS);
    expect(modifierFactor(NEUTRAL_MODIFIERS.collectRate)).toBe(1);
    expect(NEUTRAL_MODIFIERS.fallenRecycling).toBe(false);
  });

  it('summiert erst alle add und multipliziert dann mit allen mul', () => {
    const modifiers = combineEffects(
      [mul('broodRate', 2), add('broodRate', 0.5), add('broodRate', 0.5)],
      null,
    );
    // (1 + 0,5 + 0,5) · 2 = 4, nicht (1 · 2 + 0,5 + 0,5) = 3.
    expect(modifierFactor(modifiers.broodRate)).toBe(4);
  });

  it('hängt nicht von der Reihenfolge der Quellen ab', () => {
    const effects = [add('collectRate', 0.2), mul('collectRate', 1.5), add('collectRate', 0.3)];
    const forward = modifierFactor(combineEffects(effects, 'vent').collectRate);
    const backward = modifierFactor(combineEffects([...effects].reverse(), 'vent').collectRate);
    expect(forward).toBeCloseTo(2.25, 12);
    expect(backward).toBeCloseTo(forward, 12);
  });

  it('lässt andere Ziele neutral', () => {
    const modifiers = combineEffects([add('collectRate', 0.2)], 'vent');
    expect(modifiers.broodRate).toBe(NEUTRAL_MODIFIERS.broodRate);
    expect(modifiers.range).toBe(NEUTRAL_MODIFIERS.range);
    expect(modifiers.fallenRecycling).toBe(false);
  });

  it('wertet die Bedingung gegen den Futterstellentyp aus, während einer Reise nie', () => {
    const effect: Effect = {
      target: 'collectRate',
      op: 'add',
      value: 0.25,
      when: { siteType: 'vent' },
    };
    expect(modifierFactor(combineEffects([effect], 'vent').collectRate)).toBe(1.25);
    expect(combineEffects([effect], 'algal-mat')).toBe(NEUTRAL_MODIFIERS);
    expect(combineEffects([effect], null)).toBe(NEUTRAL_MODIFIERS);
  });

  it('schaltet Freischaltungen ein; mehrere Quellen wirken wie eine', () => {
    const unlock: Effect = { target: 'fallenRecycling', op: 'unlock' };
    expect(combineEffects([unlock], null).fallenRecycling).toBe(true);
    expect(combineEffects([unlock, unlock], null)).toEqual(combineEffects([unlock], null));
  });

  it('wird nie negativ, auch bei abweichenden Daten', () => {
    expect(effectValue(1, { add: -3, mul: 1 })).toBe(0);
    expect(effectValue(5, { add: 0, mul: -1 })).toBe(0);
    const modifiers = combineEffects([mul('combatLoss', -0.5)], null);
    expect(expectedLosses(Num.from(34), Num.from(26), DEFAULT_BALANCE, modifiers).toNumber()).toBe(
      0,
    );
  });
});

describe('isValidEffect (Game-Design §4.13, Datenregel)', () => {
  it.each<[string, Effect]>([
    ['add ≥ 0', add('collectRate', 0.2)],
    ['add 0', add('broodRate', 0)],
    ['mul ≥ 1', mul('spacePerQueen', 1.25)],
    ['senkend auf combatLoss', mul('combatLoss', 0.75)],
    ['Reichweite add', add('range', 1)],
    ['Pheromonpunkte ganzzahlig', add('pheromonePoints', 2)],
    ['Bedingung bei collectRate', { ...add('collectRate', 0.25), when: { siteType: 'vent' } }],
    ['Freischaltung', { target: 'fallenRecycling', op: 'unlock' }],
  ])('lässt %s zu', (_name, effect) => {
    expect(isValidEffect(effect)).toBe(true);
  });

  it.each<[string, Effect]>([
    ['add < 0', add('collectRate', -0.1)],
    ['mul 0', mul('broodRate', 0)],
    ['mul < 0', mul('broodRate', -1)],
    ['senkend außer combatLoss', mul('collectRate', 0.5)],
    ['combatLoss mit add', add('combatLoss', 0.1)],
    ['combatLoss mit Faktor ≥ 1', mul('combatLoss', 1.2)],
    ['Reichweite mul', mul('range', 2)],
    ['Pheromonpunkte gebrochen', add('pheromonePoints', 0.5)],
    ['nicht endlich', add('range', Infinity)],
    ['Bedingung außer collectRate', { ...add('broodRate', 0.2), when: { siteType: 'vent' } }],
  ])('weist %s ab', (_name, effect) => {
    expect(isValidEffect(effect)).toBe(false);
  });
});

describe('Effekte in den Formeln (Game-Design §4.13)', () => {
  it('rechnen neutral wie ohne Effekte', () => {
    expect(swarmRange(DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(5);
    expect(attackPerSoldier(DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(1);
    expect(spacePerQueen(DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(10);
    expect(sacrificeYieldShare(DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(0.5);
    expect(recycledFood(Num.from(10), DEFAULT_BALANCE, NEUTRAL_MODIFIERS)).toBe(Num.ZERO);
  });

  it('Beispiel 9: Sammeln am Schlot und an der Algenmatte', () => {
    const effects: Effect[] = [
      add('collectRate', 0.2), // Cilien-Schlag I
      add('collectRate', 0.3), // Cilien-Schlag II
      mul('collectRate', 1.5), // Geißelschlag
      { target: 'collectRate', op: 'add', value: 0.25, when: { siteType: 'vent' } }, // Thermosynthese
      mul('collectRate', 1.5), // Planktonblüte
    ];
    const drones = units(1, 100, 0);
    const stock = Num.from(1000);
    const vent = combineEffects(effects, 'vent');
    expect(modifierFactor(vent.collectRate)).toBeCloseTo(3.9375, 12);
    expect(foodPerSecond(drones, stock, DEFAULT_BALANCE, vent).toNumber()).toBeCloseTo(80.25, 10);
    const algalMat = combineEffects(effects, 'algal-mat');
    expect(modifierFactor(algalMat.collectRate)).toBeCloseTo(3.375, 12);
    expect(foodPerSecond(drones, stock, DEFAULT_BALANCE, algalMat).toNumber()).toBeCloseTo(69, 10);
  });

  it('Beispiel 10: Kampf mit Säurevakuole, Nesselzellen und Autophagie', () => {
    const modifiers = combineEffects(
      [
        add('attackPerSoldier', 0.2), // Säurevakuole
        { target: 'fallenRecycling', op: 'unlock' }, // Autophagie
        mul('combatLoss', 0.75), // Nesselzellen
      ],
      null,
    );
    const soldiers = Num.from(34);
    expect(soldierAttack(soldiers, DEFAULT_BALANCE, modifiers).toNumber()).toBeCloseTo(40.8, 10);
    const losses = expectedLosses(soldiers, Num.from(26), DEFAULT_BALANCE, modifiers);
    expect(losses.toNumber()).toBeCloseTo(5.18, 2);
    expect(losses.div(soldiers).toNumber()).toBeCloseTo(0.152, 3);
    expect(recycledFood(losses, DEFAULT_BALANCE, modifiers).toNumber()).toBeCloseTo(64.7, 1);
    const attack = soldierAttack(soldiers, DEFAULT_BALANCE, modifiers);
    expect(isCapturable(attack, Num.from(52))).toBe(false);
  });

  it('begrenzt die Verluste mit M_verlust ≤ 1 auf λ · S', () => {
    const modifiers = combineEffects([mul('combatLoss', 0.75)], null);
    const losses = expectedLosses(Num.from(10), Num.from(1000), DEFAULT_BALANCE, modifiers);
    expect(losses.toNumber()).toBeCloseTo(10 * 0.5 * 0.75, 12);
  });

  it('Platz je Königin mit Brutwaben und Knospung', () => {
    const modifiers = combineEffects([add('spacePerQueen', 2), mul('spacePerQueen', 1.25)], null);
    expect(spacePerQueen(DEFAULT_BALANCE, modifiers)).toBe(15);
    expect(spaceAvailable(units(2, 0, 0), DEFAULT_BALANCE, modifiers).toNumber()).toBe(30);
  });

  it('Ausbeute beim Opfern mit Autophagie', () => {
    const modifiers = combineEffects([add('sacrificeYield', 0.4)], null);
    expect(sacrificeYieldShare(DEFAULT_BALANCE, modifiers)).toBeCloseTo(0.7, 12);
    const bought = units(0, 0, 0);
    expect(dronesPerQueen(bought, DEFAULT_BALANCE, modifiers)?.toNumber()).toBeCloseTo(8.57, 2);
  });

  it('hält den Umwandlungsverlust beim Opfern mindestens bei v_min', () => {
    const modifiers = combineEffects(
      [add('sacrificeYield', 5), mul('sacrificeYield', 3), mul('sacrificeYield', 2)],
      null,
    );
    expect(sacrificeYieldShare(DEFAULT_BALANCE, modifiers)).toBeCloseTo(0.9, 12);
    expect(sacrificeLossShare(DEFAULT_BALANCE, modifiers)).toBeCloseTo(0.1, 12);
  });

  it('Reichweite mit Chemotaxis', () => {
    expect(swarmRange(DEFAULT_BALANCE, combineEffects([add('range', 1)], null))).toBe(6);
  });

  it('begrenzt die Fundchance auf 1', () => {
    const modifiers = combineEffects([mul('findChance', 2)], null);
    expect(siteFindChance('vent', DEFAULT_BALANCE, modifiers)).toBeCloseTo(
      DEFAULT_BALANCE.ventFindChance * 2,
      12,
    );
    const huge = combineEffects([add('findChance', 100)], null);
    expect(siteFindChance('whale-fall', DEFAULT_BALANCE, huge)).toBe(1);
  });
});
