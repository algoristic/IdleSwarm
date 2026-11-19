import { DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { createInitialState } from '@app/engine/domain/game-state-logic';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { Num } from '@app/shared/util/num/num';
import type { SiteCandidate } from '@app/site/domain/models/map.model';

import { HERE_RADIUS, MAP_CENTER, MAP_RADIUS } from '../../domain/sonar-map-logic';
import type { SonarSource } from './sonar.model';
import { toSonarView } from './sonar.utils';

const candidate = (
  type: SiteCandidate['type'],
  x: number,
  y: number,
  size: number,
  defense: number,
): SiteCandidate => ({
  type,
  position: { x, y },
  size: Num.from(size),
  defense: Num.from(defense),
});

// Reichweite 5, Saum 1: bis 5 in Reichweite, bis 6 außer Reichweite, darüber unerforscht.
const CANDIDATES: readonly SiteCandidate[] = [
  candidate('algal-mat', 2, 0, 10_000, 0),
  candidate('vent', 3, 0, 30_000, 26),
  candidate('bacterial-mat', 0, 4, 55_000, 52),
  candidate('whale-fall', 5.5, 0, 80_000, 10),
  candidate('methane-seep', 0, -6.5, 60_000, 30),
];

describe('toSonarView', () => {
  const base = createInitialState({ seed: 'sonar', now: 0 });

  function state(change: Partial<GameState> = {}, units = { queens: 20, drones: 0, soldiers: 34 }) {
    return {
      ...base,
      units: {
        queens: Num.from(units.queens),
        drones: Num.from(units.drones),
        soldiers: Num.from(units.soldiers),
      },
      map: { ...base.map, candidates: CANDIDATES },
      ...change,
    } satisfies GameState;
  }

  function view(gameState = state(), selected: SonarSource['selected'] = null) {
    return toSonarView({ state: gameState, selected }, DEFAULT_BALANCE);
  }

  it('leitet Urteil und Aufbruchssperre je Ziel ab', () => {
    const { targets } = view();
    expect(targets.map((t) => t.verdict)).toEqual([
      'capturable',
      'capturable',
      'too-strong',
      'out-of-range',
      'unexplored',
    ]);
    expect(targets.map((t) => t.blocker)).toEqual([
      null,
      null,
      'too-strong',
      'out-of-range',
      'unexplored',
    ]);
  });

  it('zeigt unerforschte Ziele nur als „?“ und außer Reichweite mit Werten', () => {
    const { targets } = view();
    expect(targets[4].details).toBeNull();
    expect(targets[3].details?.type).toBe('whale-fall');
    expect(targets[3].details?.distance).toBe(5.5);
  });

  it('nennt Werte, Verluste und Balken eines einnehmbaren Ziels', () => {
    const details = view().targets[1].details;
    expect(details?.travelSeconds.toNumber()).toBe(30);
    expect(details?.findChancePercent).toBeCloseTo(20);
    expect(details?.attack.toNumber()).toBe(34);
    // L = 34 · 0,5 · (26 / 34)² ≈ 9,94 (Game-Design Beispiel 8)
    expect(details?.losses?.soldiers.amount.toNumber()).toBeCloseTo(9.94, 2);
    // Aufgerundet wie `formatUp`: Die Mehrzahl richtet sich nach der angezeigten 10.
    expect(details?.losses?.soldiers.shown).toBe(10);
    expect(details?.losses?.percent.toNumber()).toBeCloseTo(29.2, 1);
    expect(details?.rewardsDna).toBe(true);
    expect(details?.attackBarPercent).toBe(100);
    expect(details?.defenseBarPercent).toBeCloseTo((26 / 34) * 100);
  });

  it('nennt für nicht einnehmbare Ziele keine Verluste und für die sichere keine DNA', () => {
    const { targets } = view();
    expect(targets[2].details?.losses).toBeNull();
    expect(targets[0].details?.rewardsDna).toBe(false);
    expect(targets[0].details?.losses?.soldiers.shown).toBe(0);
  });

  it('lässt beide Balken leer, wenn Angriff und Abwehr angezeigt 0 sind', () => {
    const bars = (soldiers: number) => {
      const details = view(state({}, { queens: 20, drones: 0, soldiers })).targets[0].details;
      return [details?.attackBarPercent, details?.defenseBarPercent];
    };
    expect(bars(0)).toEqual([0, 0]);
    // Ein Rest nach Verlusten erscheint abgerundet als 0 und füllt keinen Balken.
    expect(bars(0.3)).toEqual([0, 0]);
    expect(bars(1)).toEqual([100, 0]);
  });

  it('markiert das Ziel der gewählten Strategie', () => {
    const marked = (strategy: GameState['auto']['strategy']) => {
      const sonar = view(state({ auto: { ...base.auto, strategy } }));
      return {
        target: sonar.strategyTarget,
        marked: sonar.targets.filter((t) => t.strategyChoice).map((t) => t.index),
      };
    };
    // K1 überschreitet den Verlustanteil von 25 %, also bleibt für „Ausgewogen“ die Algenmatte.
    expect(marked('balanced')).toEqual({ target: 0, marked: [0] });
    expect(marked('least-resistance')).toEqual({ target: 0, marked: [0] });
    expect(marked('battle-hardened')).toEqual({ target: 1, marked: [1] });
  });

  it('zeigt im Detailpanel die Wahl des Spielers, sonst das Ziel der Strategie', () => {
    expect(view().selected?.index).toBe(0);
    const chosen = view(state(), 2);
    expect(chosen.selected?.index).toBe(2);
    expect(chosen.targets.filter((t) => t.selected).map((t) => t.index)).toEqual([2]);
    expect(view(state(), 99).selected?.index).toBe(0);
  });

  it('zeigt, wer mit der aktuellen Priorität zurückbleibt, und rechnet mit S′', () => {
    // Platz 10, belegt 10 Drohnen + 5 Soldaten · 2 = 20.
    const sonar = view(state({ priority: 'drones-first' }), null);
    const crowded = view(
      state({ priority: 'drones-first' }, { queens: 1, drones: 10, soldiers: 5 }),
    );
    expect(sonar.transport?.fitsAll).toBe(true);
    expect(crowded.transport).toMatchObject({ priority: 'drones-first', fitsAll: false });
    expect(crowded.transport?.carriedDrones.shown).toBe(10);
    expect(crowded.transport?.carriedSoldiers.shown).toBe(0);
    // Angezeigt 0 Zurückgelassene fallen weg.
    expect(crowded.transport?.leftDrones).toBeNull();
    expect(crowded.transport?.leftSoldiers?.amount.toNumber()).toBe(5);
    expect(crowded.transport?.leftSoldiers?.shown).toBe(5);
    expect(crowded.targets[1].verdict).toBe('too-strong');
    expect(crowded.targets[1].blocker).toBe('too-strong');
    expect(crowded.targets[0].blocker).toBeNull();
  });

  it('rundet Zurückgelassene wie die Anzeige auf', () => {
    // Platz 10, belegt 9,5 Drohnen + 0,4 Soldaten · 2 = 10,3; mit Drohnen zuerst bleiben 0,15 Soldaten.
    const { transport } = view(
      state({ priority: 'drones-first' }, { queens: 1, drones: 9.5, soldiers: 0.4 }),
    );
    expect(transport?.leftDrones).toBeNull();
    expect(transport?.leftSoldiers?.amount.toNumber()).toBeCloseTo(0.15);
    expect(transport?.leftSoldiers?.shown).toBe(1);
    expect(transport?.carriedDrones.shown).toBe(9);
  });

  it('sperrt unerforschte Ziele mit eigenem Grund', () => {
    const { targets } = view();
    expect(targets[4].status).toBe('unexplored');
    expect(targets[4].blocker).toBe('unexplored');
    expect(targets[3].blocker).toBe('out-of-range');
  });

  it('sperrt während der Reise jeden Aufbruch und zeigt die Restdauer', () => {
    const sonar = view(state({ travel: { target: CANDIDATES[1], remainingMs: 12_500 } }));
    expect(sonar.targets.every((t) => t.blocker === 'traveling')).toBe(true);
    // Strategieziel und Mitnahme gelten erst nach der Ankunft wieder.
    expect(sonar.strategyTarget).toBeNull();
    expect(sonar.targets.some((t) => t.strategyChoice)).toBe(false);
    expect(sonar.selected).toBeNull();
    expect(sonar.transport).toBeNull();
    expect(sonar.travel?.type).toBe('vent');
    expect(sonar.travel?.secondsLeft.toNumber()).toBe(12.5);
    expect(sonar.forfeitedStock).toBeNull();
  });

  it('weist auf den verfallenden Restvorrat hin, solange einer da ist', () => {
    expect(view().forfeitedStock?.toNumber()).toBe(20_000);
    expect(view(state({ site: { ...base.site, stock: Num.ZERO } })).forfeitedStock).toBeNull();
  });

  it('nennt die Restzeit des Vorrats nur, solange einer da ist', () => {
    const drones = { queens: 1, drones: 5, soldiers: 0 };
    expect(view(state({}, drones)).site.secondsLeft?.toNumber()).toBeGreaterThan(0);
    const empty = view(state({ site: { ...base.site, stock: Num.ZERO } }, drones));
    expect(empty.site.secondsLeft).toBeNull();
    expect(empty.site.stockPercent).toBe(0);
  });

  it('nennt die Kosten einer Königin in Drohnen', () => {
    const queen = (drones: number) => view(state({}, { queens: 1, drones, soldiers: 0 })).queen;
    // 60 / (0,5 · 10) = 12 Drohnen (Game-Design Beispiel 6)
    expect(queen(11).price?.amount.toNumber()).toBe(12);
    expect(queen(11).price?.shown).toBe(12);
    expect(queen(11).possible).toBe(false);
    expect(queen(12).possible).toBe(true);
  });

  it('übernimmt die Einstellungen mit der Schwelle in Prozent', () => {
    const sonar = view(
      state({ auto: { enabled: true, strategy: 'battle-hardened', threshold: 0.3 } }),
    );
    expect(sonar.settings).toEqual({
      priority: 'balanced',
      strategy: 'battle-hardened',
      autoEnabled: true,
      thresholdPercent: 30,
      maxThresholdPercent: 90,
    });
  });

  it('zeigt eine geladene Schwelle über θ_max als wirksames θ_max', () => {
    const sonar = view(state({ auto: { enabled: true, strategy: 'balanced', threshold: 1 } }));
    expect(sonar.settings.thresholdPercent).toBe(90);
  });

  describe('Sonar-Karte', () => {
    // Kandidaten bis Distanz 6,5: sieben Ringe.
    const unit = MAP_RADIUS / 7;
    const atOrigin = (change: Partial<GameState> = {}) =>
      state({
        map: {
          ...base.map,
          candidates: CANDIDATES,
          position: { x: 0, y: 0 },
          route: [
            { type: 'vent', position: { x: -2, y: 0 } },
            { type: 'vent', position: { x: 0, y: 0 } },
          ],
        },
        ...change,
      });

    it('legt ganze Ringe von außen nach innen und die Reichweite in den Maßstab', () => {
      const { map } = view(atOrigin());
      expect(map.rings.map((ring) => ring.distance)).toEqual([7, 6, 5, 4, 3, 2, 1]);
      expect(map.rings[0].radius).toBeCloseTo(MAP_RADIUS);
      expect(map.range.radius).toBeCloseTo(5 * unit);
      expect(map.rings.find((ring) => ring.distance === 5)?.labeled).toBe(false);
    });

    it('setzt Ziele relativ zur eigenen Position und übernimmt deren Urteil', () => {
      const { map, targets } = view(atOrigin());
      const x = Math.round((MAP_CENTER + 2 * unit) * 10) / 10;
      expect(map.nodes[0].translate).toBe(`translate(${x} ${MAP_CENTER})`);
      expect(map.nodes.map((node) => node.target)).toEqual(targets);
      expect(map.nodes.map((node) => node.dimmed)).toEqual([false, false, false, true, true]);
      expect(map.nodes[0].defenseDash).toBeNull();
      expect(map.nodes[2].defenseDash).not.toBeNull();
    });

    it('zeigt die bisherige Route bis zur eigenen Position', () => {
      const { trail } = view(atOrigin()).map;
      expect(trail.points).toHaveLength(1);
      expect(trail.path).toMatch(/L400 400$/);
    });

    it('zeigt die Route nur zum gewählten Ziel in Reichweite', () => {
      expect(view(atOrigin(), 1).map.route).toMatch(
        new RegExp(`^M${MAP_CENTER + HERE_RADIUS} 400 Q`),
      );
      expect(view(atOrigin(), 3).map.route).toBeNull();
    });

    it('zeigt während der Reise die Reiseroute mit Fortschritt statt der Auswahl', () => {
      const traveling = atOrigin({ travel: { target: CANDIDATES[1], remainingMs: 15_000 } });
      const { map } = view(traveling, 1);
      expect(map.route).toBeNull();
      expect(map.nodes.every((node) => node.dimmed)).toBe(true);
      // Reise über Distanz 3 dauert 30 s; nach der Hälfte liegt der Schwarm mittig auf der Linie.
      const end = MAP_CENTER + 3 * unit;
      expect(map.travel?.swarm.x).toBeCloseTo((MAP_CENTER + HERE_RADIUS + end) / 2, 0);
      expect(map.travel?.swarm.y).toBe(MAP_CENTER);
    });
  });
});
