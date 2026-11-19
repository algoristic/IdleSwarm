import { BalanceParams, DEFAULT_BALANCE, TICK_MS } from '@app/balance/domain/constants';
import { createActiveBot } from '@app/model/domain/bots/active-bot-logic';
import { createIdleBot } from '@app/model/domain/bots/idle-bot-logic';

import type { Bot } from './bot-logic';
import type { Command } from './commands-logic';
import { stallSpans } from './cycle-metrics-logic';
import { createInitialState } from './game-state-logic';
import {
  BUY_GAP_WINDOW_MS,
  DEFAULT_SIM_STEP_MS,
  runSimulation,
  SimEvent,
  SimOptions,
  SimResult,
} from './runner-logic';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const BUDGET_MS = 5000;

/** Toleranzen des großen Schritts gegenüber dem echten 100-ms-Takt. */
const SITE_TOLERANCE = 0.005;
/**
 * Jeder Weiterzug verschiebt den Verlauf um die kleine Abweichung der Futterstelle davor; die
 * letzte Futterstelle sammelt darum unterschiedlich lange. Ohne Weiterziehen reichte 1 %, ohne
 * Drüsenpunkte 2 %. Seit M1.3 kauft „Aktiv“ Drüsenpunkte, bis die Brut durch die Nahrung begrenzt
 * ist; dann konkurrieren Käufe (jede Sekunde) und Brut (jeder Schritt) im groben Schritt anders um die
 * Nahrung. Bei Seed `runner` liegt die letzte Ankunft kurz vor dem Laufende, wo die Drohnen nach dem
 * Transport schnell nachwachsen: 8 s Versatz ergeben dort rund 12 %.
 */
const UNIT_TOLERANCE = 0.15;

const BUY_DRONE: Command = { type: 'buy', unit: 'drones' };

/**
 * Ohne Königin keine Brut, ohne Grundertrag nur Drohnen als Zufluss, ohne Preisfaktor konstante
 * Preise: alles bleibt nachrechenbar.
 */
const SIMPLE: Partial<BalanceParams> = {
  baseFoodRate: 0,
  startQueens: 0,
  startFood: 1000,
  droneCostGrowth: 1,
  siteSize: 1e9,
};

/**
 * Liest, ob dieser Lauf Coverage erhebt. `ng test --coverage` gibt das nur in der Worker-Konfiguration
 * von Vitest weiter; ändert sich deren Form, schlägt die Datei fehl, statt Tests still zu überspringen.
 */
function isCoverageRun(): boolean {
  const { __vitest_worker__: worker } = globalThis as unknown as {
    __vitest_worker__?: { config?: { coverage?: { enabled?: unknown } } };
  };
  const enabled = worker?.config?.coverage?.enabled;
  if (typeof enabled !== 'boolean') {
    throw new Error('Vitest-Konfiguration ohne coverage.enabled');
  }
  return enabled;
}

function scripted(script: Readonly<Record<number, readonly Command[]>>): Bot {
  const times = Object.keys(script)
    .map(Number)
    .sort((a, b) => a - b);
  return {
    name: 'script',
    nextActionMs: (afterMs) => times.find((time) => time > afterMs) ?? Infinity,
    decide: (_state, view) => script[view.timeMs] ?? [],
  };
}

function run(bot: Bot, overrides: Partial<SimOptions> = {}): SimResult {
  return runSimulation({
    seed: 'runner',
    bot,
    durationMs: 10 * MINUTE_MS,
    sampleEveryMs: MINUTE_MS,
    ...overrides,
  });
}

function relativeError(actual: number, expected: number): number {
  return Math.abs(actual - expected) / expected;
}

function finiteNumbers(value: unknown): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value);
  }
  return typeof value === 'object' && value !== null
    ? Object.values(value).every(finiteNumbers)
    : true;
}

describe('runSimulation', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Reproduzierbarkeit', () => {
    it.each([
      ['Aktiv', createActiveBot],
      ['Idle', createIdleBot],
    ])('liefert für %s bei gleichen Optionen dasselbe Ergebnis', (_name, createBot) => {
      // Die kleine Futterstelle bringt Käufe und Futterstellen-Wechsel in einen kurzen Lauf.
      const options = { durationMs: 15 * MINUTE_MS, params: { siteSize: 500 } };
      const result = run(createBot(), options);
      expect(result.events.some((event) => event.type === 'arrived')).toBe(true);
      expect(run(createBot(), options)).toEqual(result);
    });

    it('nutzt weder Uhr noch globalen Zufall', () => {
      const random = vi.spyOn(Math, 'random');
      const clock = vi.spyOn(Date, 'now');
      run(createActiveBot());
      expect(random).not.toHaveBeenCalled();
      expect(clock).not.toHaveBeenCalled();
    });

    it('hängt vom Seed ab, sobald der Schwarm weiterzieht', () => {
      // Der Generator zieht die Kandidaten aus dem Seed.
      const options = { durationMs: 15 * MINUTE_MS, params: { siteSize: 500 } };
      const first = run(createActiveBot(), { ...options, seed: 'eins' });
      const second = run(createActiveBot(), { ...options, seed: 'zwei' });
      expect(second.seed).toBe('zwei');
      expect({ ...second, seed: first.seed }).not.toEqual(first);
    });

    it('hängt nicht vom Startzeitpunkt ab', () => {
      const first = run(createIdleBot());
      const second = run(createIdleBot(), { startTimeMs: 1_700_000_000_000 });
      expect({ ...second, startTimeMs: 0 }).toEqual(first);
    });
  });

  describe('Parameter', () => {
    it('legt Overrides über die Standardwerte', () => {
      const { params, samples } = run(scripted({}), { params: { siteSize: 123, startFood: 7 } });
      expect(params).toEqual({ ...DEFAULT_BALANCE, siteSize: 123, startFood: 7 });
      expect(samples[0].stock).toBe(123);
      expect(samples[0].food).toBe(7);
    });

    it('lässt die Standardwerte unverändert und wirkt auf den Verlauf', () => {
      const base = run(createActiveBot());
      const faster = run(createActiveBot(), { params: { droneCollectRate: 1 } });
      expect(DEFAULT_BALANCE.droneCollectRate).toBe(0.2);
      expect(faster.samples.at(-1)?.foodPerSecond).toBeGreaterThan(
        base.samples.at(-1)?.foodPerSecond ?? Infinity,
      );
    });
  });

  describe('Zeitreihen', () => {
    it('tastet in festem Abstand ab und schließt mit dem Laufende', () => {
      const { samples } = run(scripted({}), {
        durationMs: 4000,
        sampleEveryMs: 1500,
        stepMs: 1000,
      });
      expect(samples.map((sample) => sample.timeMs)).toEqual([0, 1500, 3000, 4000]);
    });

    it('rechnet Sammeln und Vorrat über die Schritte mit', () => {
      const { samples } = run(scripted({ 0: Array(5).fill(BUY_DRONE) }), {
        params: { ...SIMPLE, siteSize: 1000 },
        durationMs: 100_000,
        sampleEveryMs: 100_000,
      });
      expect(samples[0]).toMatchObject({ food: 950, drones: 5, stock: 1000, foodPerSecond: 1 });
      expect(samples[1].food).toBeCloseTo(1050, 8);
      expect(samples[1].stock).toBeCloseTo(900, 8);
    });

    it('nimmt Abtastpunkte nach den Aktionen desselben Zeitpunkts auf', () => {
      const { samples } = run(scripted({ 0: [BUY_DRONE] }), { params: SIMPLE });
      expect(samples[0].drones).toBe(1);
    });

    it('schätzt die Zeit bis zum Kauf aus Nahrung und Nettozufluss', () => {
      // Eine Drohne, 0 Nahrung, 1,5 + 0,2 Nahrung/s: Fehlbetrag / Zufluss je Einheitentyp.
      const { samples } = run(scripted({ 0: [BUY_DRONE] }), {
        params: { startQueens: 0, startFood: 10 },
      });
      const { nextBuyMs, netFoodPerSecond } = samples[0];
      expect(netFoodPerSecond).toBeCloseTo(1.7, 10);
      expect(nextBuyMs.drones).toBeCloseTo((10.7 / 1.7) * 1000, 6);
      expect(nextBuyMs.soldiers).toBeCloseTo((25 / 1.7) * 1000, 6);
      expect(nextBuyMs.queens).toBeCloseTo((60 / 1.7) * 1000, 6);
      expect(nextBuyMs.total).toBeCloseTo((10.7 / 1.7) * 1000, 6);
    });

    it('meldet 0 für bezahlbare Käufe', () => {
      const { nextBuyMs } = run(scripted({}), { params: SIMPLE }).samples[0];
      expect(nextBuyMs).toEqual({ queens: 0, drones: 0, soldiers: 0, total: 0 });
    });

    it('meldet null, wenn der Kauf beim aktuellen Zufluss nie erreicht wird', () => {
      // Eine Königin ohne Drohnen und ohne Grundertrag: Der Nettozufluss ist negativ.
      const { nextBuyMs, netFoodPerSecond } = run(scripted({}), {
        params: { startFood: 0, baseFoodRate: 0 },
      }).samples[0];
      expect(netFoodPerSecond).toBeCloseTo(-1.375, 10);
      expect(nextBuyMs).toEqual({ queens: null, drones: null, soldiers: null, total: null });
    });

    it('zählt Soldaten nicht zur Gesamtzeit', () => {
      // Soldat bezahlbar, Drohne und Königin ohne Zufluss nie.
      const { nextBuyMs } = run(scripted({}), {
        params: { startQueens: 0, startFood: 30, droneCost: 40, baseFoodRate: 0 },
      }).samples[0];
      expect(nextBuyMs.soldiers).toBe(0);
      expect(nextBuyMs.total).toBeNull();
    });
  });

  describe('Ereignisse und Futterstellen', () => {
    it('hält entwickelte Genom-Knoten fest, wirkungslose Käufe nicht', () => {
      const evolveCilia: Command = { type: 'evolve', node: 'cilia-1' };
      const { events } = run(scripted({ 60_000: [evolveCilia], 120_000: [evolveCilia] }), {
        params: { genomeCost: 0 },
        durationMs: 3 * MINUTE_MS,
      });
      expect(events.filter((event) => event.type === 'evolved')).toEqual([
        { timeMs: 60_000, type: 'evolved', node: 'cilia-1' },
      ]);
    });

    /** Ohne Platzbedarf kommen alle Drohnen mit; fünf Drohnen sammeln 1 Nahrung/s. */
    const MOVING: Partial<BalanceParams> = { ...SIMPLE, siteSize: 100, droneSpace: 0 };
    const FIVE_DRONES: readonly Command[] = Array(5).fill(BUY_DRONE);
    const ENABLE_AUTO_MOVE: Command = { type: 'setAutoMove', enabled: true };

    // Ziel aus dem Startzustand: Ohne Soldaten ist nur die sichere Algenmatte einnehmbar.
    const { candidates } = createInitialState(
      { seed: 'runner', now: 0 },
      { ...DEFAULT_BALANCE, ...MOVING },
    ).map;
    const target = candidates.findIndex((candidate) => candidate.defense.isZero());
    const { position, size } = candidates[target];
    const travelMs =
      Math.hypot(position.x, position.y) * DEFAULT_BALANCE.travelSecondsPerDistance * 1000;
    const secondSiteMs = size.toNumber() * 1000;

    const typeAndSite = (event: SimEvent) => ({
      type: event.type,
      site: 'site' in event ? event.site : null,
    });

    const manual = () =>
      run(scripted({ 0: FIVE_DRONES, 120_000: [{ type: 'depart', target }] }), {
        params: MOVING,
        durationMs: 5 * MINUTE_MS,
        // Der grobe Schritt prüft, dass die Zeitpunkte nicht an der Schrittweite hängen.
        stepMs: 30_000,
      });

    it('hält Käufe, leere Futterstellen, Aufbruch und Ankunft mit Zeitstempel fest', () => {
      // Funde prüft ein eigener Test; hier zählt der Ablauf der Futterstellen.
      const events = manual().events.filter((event) => event.type !== 'found');
      expect(events.slice(0, 7)).toEqual([
        ...Array.from({ length: 5 }, () => ({ timeMs: 0, type: 'buy', unit: 'drones' })),
        { timeMs: 100_000, type: 'siteEmpty', site: 0 },
        { timeMs: 120_000, type: 'departed', site: 0, target: 'algal-mat', auto: false },
      ]);
      expect(events.slice(7).map(typeAndSite)).toEqual([
        { type: 'arrived', site: 1 },
        { type: 'siteEmpty', site: 1 },
      ]);
      expect(events[7]).toMatchObject({ siteType: 'algal-mat' });
      expect(events[7].timeMs).toBeCloseTo(120_000 + travelMs, 3);
      expect(events[8].timeMs).toBeCloseTo(120_000 + travelMs + secondSiteMs, 3);
    });

    it('hält Funde mit Futterstelle, Eintrag und Art fest (Game-Design §4.16)', () => {
      const { events } = run(scripted({ 0: FIVE_DRONES, 120_000: [{ type: 'depart', target }] }), {
        params: { ...MOVING, ventFindChance: 1, algalMatFindChance: 1 },
        durationMs: 5 * MINUTE_MS,
        stepMs: 30_000,
      });
      const found = events.filter((event) => event.type === 'found');
      // Vier Abbau-Schwellen am Schlot (je 25 s), eine Ziehung bei der Ankunft, vier an der Algenmatte.
      expect(found.map((event) => event.site)).toEqual([0, 0, 0, 0, 1, 1, 1, 1, 1]);
      expect(found.slice(0, 4).map((event) => event.timeMs)).toEqual([
        25_000, 50_000, 75_000, 100_000,
      ]);
      expect(found[0]).toEqual({
        timeMs: 25_000,
        type: 'found',
        site: 0,
        entry: 'foreign-dna',
        kind: 'dna',
        replaced: null,
      });
      const arrival = events.findIndex((event) => event.type === 'arrived');
      expect(events[arrival + 1]).toMatchObject({ type: 'found', site: 1 });
    });

    it('misst die Dauer je Futterstelle bis zum Aufbruch und die Reise getrennt', () => {
      const { sites, firstSiteMs, longestSiteStayMs } = manual().metrics;
      // Leer nach 100 s, Aufbruch erst bei 120 s.
      expect(firstSiteMs).toBe(120_000);
      expect(sites).toHaveLength(2);
      expect(sites[0]).toMatchObject({
        index: 0,
        siteType: 'vent',
        startMs: 0,
        travelMs: 0,
        emptyMs: 100_000,
        departureMs: 120_000,
        durationMs: 120_000,
        size: 100,
        collected: 100,
      });
      expect(sites[1]).toMatchObject({
        index: 1,
        siteType: 'algal-mat',
        departureMs: null,
        durationMs: null,
        defense: 0,
        fought: false,
        dna: 0,
      });
      expect(sites[1].travelMs).toBeCloseTo(travelMs, 3);
      expect(sites[1].startMs).toBeCloseTo(120_000 + travelMs, 3);
      expect(sites[1].emptyMs).toBeCloseTo(120_000 + travelMs + secondSiteMs, 3);
      expect(sites[1].collected).toBeCloseTo(size.toNumber(), 8);
      // Die offene Futterstelle reicht bis zum Laufende.
      expect(longestSiteStayMs).toBeCloseTo(5 * MINUTE_MS - 120_000 - travelMs, 3);
    });

    it.each([30_000, TICK_MS])(
      'bricht mit Auto-Weiterziehen bei Schrittweite %d ms genau am leeren Vorrat auf',
      (stepMs) => {
        const { events, metrics } = run(scripted({ 0: [...FIVE_DRONES, ENABLE_AUTO_MOVE] }), {
          params: MOVING,
          durationMs: 5 * MINUTE_MS,
          stepMs,
        });
        const moves = events.filter((event) => event.type !== 'buy' && event.type !== 'found');
        expect(moves.map(typeAndSite)).toEqual([
          { type: 'siteEmpty', site: 0 },
          { type: 'departed', site: 0 },
          { type: 'arrived', site: 1 },
          { type: 'siteEmpty', site: 1 },
          { type: 'departed', site: 1 },
          { type: 'arrived', site: 2 },
        ]);
        const [, departed, arrived, emptied, departedAgain] = moves;
        expect(moves[0].timeMs).toBe(100_000);
        expect(departed).toEqual({
          timeMs: 100_000,
          type: 'departed',
          site: 0,
          target: 'algal-mat',
          auto: true,
        });
        expect(arrived.timeMs).toBeCloseTo(100_000 + travelMs, 3);
        expect(emptied.timeMs).toBeCloseTo(100_000 + travelMs + secondSiteMs, 3);
        // Der Runner teilt den Schritt an der nächsten ganzen Millisekunde.
        expect(departedAgain.timeMs - emptied.timeMs).toBeGreaterThanOrEqual(0);
        expect(departedAgain.timeMs - emptied.timeMs).toBeLessThanOrEqual(1);
        const [, second] = metrics.sites;
        expect(second.travelMs).toBeCloseTo(travelMs, 3);
        expect(second.departureMs).toBe(departedAgain.timeMs);
        expect(second.durationMs).toBeCloseTo(secondSiteMs, 0);
      },
    );

    it('lässt eine nicht geleerte Futterstelle offen', () => {
      const { sites, firstSiteMs } = run(scripted({}), { params: SIMPLE }).metrics;
      expect(firstSiteMs).toBeNull();
      expect(sites).toEqual([
        {
          index: 0,
          siteType: 'vent',
          startMs: 0,
          travelMs: 0,
          emptyMs: null,
          departureMs: null,
          durationMs: null,
          size: 1e9,
          collected: 0,
          defense: 0,
          fought: false,
          dna: 0,
          soldiersBeforeDeparture: null,
          soldiersCarried: null,
          soldiersAtArrival: 0,
          losses: 0,
          soldiersAfterCapture: 0,
        },
      ]);
    });

    it('erkennt, wenn der Grundertrag allein den Vorrat leert', () => {
      const { events, metrics } = run(scripted({}), {
        params: { startQueens: 0, siteSize: 30 },
        // Der grobe Schritt prüft, dass der Zeitpunkt nicht an der Schrittweite hängt.
        stepMs: 7000,
      });
      expect(events.filter((event) => event.type !== 'found')).toEqual([
        { timeMs: 20_000, type: 'siteEmpty', site: 0 },
      ]);
      // Funde an den Abbau-Schwellen liegen exakt bei 25 %, 50 %, 75 % und 100 % (je 5 s).
      for (const event of events.filter((event) => event.type === 'found')) {
        expect(event.timeMs).toBeCloseTo(Math.round(event.timeMs / 5_000) * 5_000, 6);
      }
      expect(metrics.sites[0].emptyMs).toBe(20_000);
      // Ohne Aufbruch bleibt die Dauer offen.
      expect(metrics.firstSiteMs).toBeNull();
    });

    it('ignoriert wirkungslose Kommandos', () => {
      const { events } = run(
        scripted({
          0: [{ type: 'depart', target: 99 }, { type: 'buy', unit: 'queens' }, { type: 'noop' }],
        }),
        { params: { startFood: 0 } },
      );
      expect(events).toEqual([]);
    });

    it.each([
      ['Aktiv', createActiveBot],
      ['Idle', createIdleBot],
    ])('zieht bei %s nach jedem leeren Vorrat automatisch weiter', (_name, createBot) => {
      const { events, metrics } = run(createBot(), {
        params: { siteSize: 500 },
        durationMs: 20 * MINUTE_MS,
      });
      const cycle = events.filter(
        (event) => event.type !== 'buy' && event.type !== 'found' && event.type !== 'evolved',
      );
      expect(metrics.sites.length).toBeGreaterThan(2);
      const order = ['siteEmpty', 'departed', 'arrived'] as const;
      cycle.forEach((event, index) => {
        const site = Math.floor(index / 3) + (event.type === 'arrived' ? 1 : 0);
        expect(event).toMatchObject({ type: order[index % 3], site });
        if (event.type === 'departed') {
          expect(event.auto).toBe(true);
        }
      });
      metrics.sites.slice(1).forEach((site, index) => {
        expect(site.startMs).toBe(cycle[index * 3 + 2].timeMs);
      });
      const times = events.map((event) => event.timeMs);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    });
  });

  describe('Kampf und Stillstand', () => {
    /**
     * Ohne Brut bleiben die Soldaten konstant; eine Königin bietet 50 Plätze für 100 Soldaten,
     * „ausgewogen“ nimmt also die Hälfte mit. Die niedrige Abwehr macht ein Kampfziel einnehmbar.
     */
    const COMBAT: Partial<BalanceParams> = {
      ...SIMPLE,
      startQueens: 1,
      queenEggsPerMin: 0,
      queenSpace: 50,
      soldierSpace: 1,
      soldierCostGrowth: 1,
      startFood: 1e6,
      siteDefenseBase: 5,
    };
    const params = { ...DEFAULT_BALANCE, ...COMBAT };
    const { candidates } = createInitialState({ seed: 'runner', now: 0 }, params).map;
    const target = candidates.findIndex(
      (candidate) =>
        candidate.defense.gt(0) &&
        Math.hypot(candidate.position.x, candidate.position.y) <= params.baseRange &&
        candidate.defense.lte(50),
    );
    const defense = candidates[target]?.defense.toNumber() ?? NaN;
    const BUY_SOLDIERS: readonly Command[] = Array(100).fill({ type: 'buy', unit: 'soldiers' });

    const fight = () =>
      run(scripted({ 0: BUY_SOLDIERS, 60_000: [{ type: 'depart', target }] }), {
        params: COMBAT,
        durationMs: 10 * MINUTE_MS,
      });

    it('hält die Soldaten-Bilanz eines Kampfziels fest', () => {
      expect(target).toBeGreaterThanOrEqual(0);
      const { sites } = fight().metrics;
      expect(sites).toHaveLength(2);
      const [first, second] = sites;
      expect(first).toMatchObject({ departureMs: 60_000, durationMs: 60_000, emptyMs: null });
      // L = S · λ · (B / A)²  mit S = A = 50, λ = 0,5; DNA = B^0,8.
      const losses = 50 * 0.5 * (defense / 50) ** 2;
      expect(second).toMatchObject({
        fought: true,
        soldiersBeforeDeparture: 100,
        soldiersCarried: 50,
        soldiersAtArrival: 50,
      });
      expect(second.defense).toBeCloseTo(defense, 10);
      expect(second.losses).toBeCloseTo(losses, 8);
      expect(second.soldiersAfterCapture).toBeCloseTo(50 - losses, 8);
      expect(second.dna).toBeCloseTo(defense ** 0.8, 8);
    });

    it('misst die Strecken ohne Kampfziel und ohne Aufbruch bis zum Laufende', () => {
      const { sites, longestNoCombatCaptureMs, longestSiteStayMs } = fight().metrics;
      const arrivalMs = sites[1].startMs;
      expect(longestNoCombatCaptureMs).toBeCloseTo(
        Math.max(arrivalMs, 10 * MINUTE_MS - arrivalMs),
        6,
      );
      expect(longestSiteStayMs).toBeCloseTo(10 * MINUTE_MS - arrivalMs, 6);
      const stalls = stallSpans(sites, 10 * MINUTE_MS, 5 * MINUTE_MS);
      expect(stalls.noDeparture).toEqual([{ fromMs: arrivalMs, toMs: 10 * MINUTE_MS, open: true }]);
      expect(stalls.noCombatCapture).toEqual([
        { fromMs: arrivalMs, toMs: 10 * MINUTE_MS, open: true },
      ]);
    });

    it('zählt ohne Kampfziel den ganzen Lauf als eine Strecke', () => {
      const { longestNoCombatCaptureMs } = run(scripted({}), { params: SIMPLE }).metrics;
      expect(longestNoCombatCaptureMs).toBe(10 * MINUTE_MS);
    });
  });

  describe('Kennzahlen', () => {
    const buys = () =>
      run(
        scripted({
          10_000: [BUY_DRONE],
          30_000: [BUY_DRONE, BUY_DRONE],
          60_000: [BUY_DRONE],
          100_000: [BUY_DRONE],
          [31 * MINUTE_MS]: [BUY_DRONE],
        }),
        { params: SIMPLE, durationMs: 40 * MINUTE_MS },
      ).metrics;

    it('misst die Zeit bis zum ersten Kauf', () => {
      expect(buys().firstBuyMs).toBe(10_000);
      expect(run(scripted({}), { params: SIMPLE }).metrics.firstBuyMs).toBeNull();
    });

    it('wertet Kauflücken der ersten 30 Minuten aus und fasst gleichzeitige Käufe zusammen', () => {
      expect(buys().buyGaps).toEqual({ count: 3, medianMs: 30_000, maxMs: 40_000 });
    });

    it('mittelt bei gerader Anzahl von Lücken', () => {
      const { buyGaps } = run(
        scripted({ 0: [BUY_DRONE], 10_000: [BUY_DRONE], 40_000: [BUY_DRONE] }),
        { params: SIMPLE },
      ).metrics;
      expect(buyGaps).toEqual({ count: 2, medianMs: 20_000, maxMs: 30_000 });
    });

    it('hat ohne Lücken keine Werte', () => {
      expect(run(scripted({}), { params: SIMPLE }).metrics.buyGaps).toEqual({
        count: 0,
        medianMs: null,
        maxMs: null,
      });
    });

    it('misst die längste Strecke ohne Kauf mit Start und Ende', () => {
      expect(buys().longestNoBuyMs).toBe(31 * MINUTE_MS - 100_000);
      expect(
        run(scripted({ 590_000: [BUY_DRONE] }), { params: SIMPLE }).metrics.longestNoBuyMs,
      ).toBe(590_000);
      expect(run(scripted({ 0: [BUY_DRONE] }), { params: SIMPLE }).metrics.longestNoBuyMs).toBe(
        10 * MINUTE_MS,
      );
    });

    it('zählt als Wartezeit, solange weder Königin noch Drohne bezahlbar ist', () => {
      // 5 Nahrung und 1 Nahrung/s Grundertrag: Die Drohne zu 10 ist ab 5 s bezahlbar.
      const { waitShare } = run(scripted({}), {
        params: { startQueens: 0, startFood: 5, baseFoodRate: 1 },
        durationMs: 20_000,
        sampleEveryMs: 20_000,
      }).metrics;
      expect(waitShare).toBeCloseTo(0.25, 10);
    });

    it('wertet einen bezahlbaren Soldaten nicht als Ende der Wartezeit', () => {
      const { waitShare } = run(scripted({}), {
        params: { startQueens: 0, startFood: 30, droneCost: 40, baseFoodRate: 0 },
      }).metrics;
      expect(waitShare).toBe(1);
    });

    describe('längste Wartestrecke', () => {
      /** Ohne Brut, Grundertrag und Sammeln ändert sich die Nahrung nur durch Käufe. */
      const STATIC: Partial<BalanceParams> = {
        baseFoodRate: 0,
        startQueens: 0,
        droneCollectRate: 0,
        droneCostGrowth: 1,
      };

      it('nimmt die längste zusammenhängende Strecke', () => {
        // 1 Nahrung/s: wartet 0–5 s, ist bis 8 s versorgt, wartet nach dem Kauf 8–15 s.
        const { longestWaitMs, waitShare } = run(scripted({ 8000: [BUY_DRONE] }), {
          params: { ...STATIC, baseFoodRate: 1, startFood: 5 },
          durationMs: 40_000,
          sampleEveryMs: 40_000,
        }).metrics;
        expect(longestWaitMs).toBe(7000);
        expect(waitShare).toBeCloseTo(12 / 40, 10);
      });

      it('hängt nicht an der Schrittweite, solange Aktionen die Strecke begrenzen', () => {
        const { longestWaitMs } = run(scripted({ 5000: [BUY_DRONE] }), {
          params: { ...STATIC, startFood: 10 },
          durationMs: 60_000,
          stepMs: 7000,
        }).metrics;
        expect(longestWaitMs).toBe(55_000);
      });

      it('endet am Fensterende, auch wenn das Warten weitergeht', () => {
        const { longestWaitMs, waitShare } = run(scripted({}), {
          params: { ...STATIC, startFood: 0 },
          durationMs: 40 * MINUTE_MS,
          // Der Schritt überspannt das Fensterende bei 30 min.
          stepMs: 7 * MINUTE_MS,
        }).metrics;
        expect(longestWaitMs).toBe(BUY_GAP_WINDOW_MS);
        expect(waitShare).toBe(1);
      });

      it('zählt von einer Strecke über das Fensterende nur den Teil davor', () => {
        const { longestWaitMs } = run(scripted({ [29 * MINUTE_MS]: [BUY_DRONE] }), {
          params: { ...STATIC, startFood: 10 },
          durationMs: 40 * MINUTE_MS,
        }).metrics;
        expect(longestWaitMs).toBe(MINUTE_MS);
      });

      it('ignoriert Wartezeit nach dem Fenster', () => {
        const { longestWaitMs, waitShare } = run(scripted({ [31 * MINUTE_MS]: [BUY_DRONE] }), {
          params: { ...STATIC, startFood: 10 },
          durationMs: 40 * MINUTE_MS,
        }).metrics;
        expect(longestWaitMs).toBe(0);
        expect(waitShare).toBeCloseTo(9 / 40, 10);
      });

      it('ist bei kürzeren Läufen durch die Laufzeit begrenzt', () => {
        const { longestWaitMs } = run(scripted({}), {
          params: { ...STATIC, startFood: 0 },
        }).metrics;
        expect(longestWaitMs).toBe(10 * MINUTE_MS);
      });
    });

    it('bestimmt die Verdopplungszeiten der Nahrungsrate', () => {
      const { foodRateDoubling } = run(
        scripted({
          0: [BUY_DRONE],
          60_000: [BUY_DRONE],
          120_000: [BUY_DRONE, BUY_DRONE],
          240_000: Array(4).fill(BUY_DRONE),
        }),
        { params: SIMPLE },
      ).metrics;
      expect(foodRateDoubling.count).toBe(3);
      expect(foodRateDoubling.medianMs).toBeCloseTo(60_000, 6);
      expect(foodRateDoubling.lastMs).toBeCloseTo(120_000, 6);
    });

    it('hat ohne Nahrungsrate keine Verdopplungszeit', () => {
      expect(run(scripted({}), { params: SIMPLE }).metrics.foodRateDoubling).toEqual({
        count: 0,
        medianMs: null,
        lastMs: null,
      });
    });
  });

  describe('Übertragbarkeit', () => {
    it('übersteht JSON und structuredClone unverändert', () => {
      const result = run(createActiveBot(), { params: { siteSize: 300 } });
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
      expect(structuredClone(result)).toEqual(result);
      expect(result.saturated).toBe(false);
    });

    it('begrenzt Werte jenseits des number-Bereichs und meldet das', () => {
      const result = run(scripted({}), {
        params: { startQueens: 1e308, queenEggsPerMin: 600 },
      });
      const [sample] = result.samples;
      expect(sample.eggsPerMinute).toBe(Number.MAX_VALUE);
      expect(sample.netFoodPerSecond).toBe(-Number.MAX_VALUE);
      expect(result.saturated).toBe(true);
      expect(finiteNumbers(result)).toBe(true);
      expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    });
  });

  describe('Eingaben', () => {
    it.each([
      ['Dauer', { durationMs: -1 }],
      ['Dauer', { durationMs: Infinity }],
      ['Abtastabstand', { sampleEveryMs: 0 }],
      ['Schrittweite', { stepMs: 0 }],
      ['Anzahl Abtastpunkte', { durationMs: HOUR_MS, sampleEveryMs: 1 }],
    ])('lehnt ungültige %s ab', (_name, options) => {
      expect(() => run(scripted({}), options)).toThrow(RangeError);
    });

    it('lehnt Bots ohne späteren Aktionszeitpunkt ab', () => {
      const stuck: Bot = { name: 'stuck', nextActionMs: (afterMs) => afterMs, decide: () => [] };
      expect(() => run(stuck)).toThrow(RangeError);
    });

    it('liefert bei Dauer 0 genau den Startpunkt', () => {
      const { samples, metrics } = run(createIdleBot(), { durationMs: 0 });
      expect(samples.map((sample) => sample.timeMs)).toEqual([0]);
      expect(metrics.waitShare).toBe(0);
    });
  });

  describe('Schrittweite', () => {
    it.each([
      ['Aktiv', createActiveBot],
      ['Idle', createIdleBot],
    ])('bleibt für %s in der Toleranz zum 100-ms-Takt', (_name, createBot) => {
      const options = { durationMs: 30 * MINUTE_MS };
      const coarse = run(createBot(), { ...options, stepMs: DEFAULT_SIM_STEP_MS });
      const exact = run(createBot(), { ...options, stepMs: TICK_MS });
      const [coarseEnd, exactEnd] = [coarse.samples.at(-1), exact.samples.at(-1)];
      if (!coarseEnd || !exactEnd) {
        throw new Error('Abtastpunkte fehlen');
      }

      expect(
        relativeError(coarse.metrics.firstSiteMs ?? 0, exact.metrics.firstSiteMs ?? 1),
      ).toBeLessThan(SITE_TOLERANCE);
      expect(coarse.metrics.sites.length).toBeGreaterThan(1);
      expect(coarse.metrics.sites.length).toBe(exact.metrics.sites.length);
      coarse.metrics.sites.slice(1).forEach((site, index) => {
        const exactStartMs = exact.metrics.sites[index + 1].startMs;
        expect(relativeError(site.startMs, exactStartMs)).toBeLessThan(SITE_TOLERANCE);
      });
      // Funde beschleunigen den Verlauf; liegt ein Königinnenkauf knapp am Laufende, fällt er mit
      // der kleinen Verschiebung des groben Schritts vor oder hinter das Ende.
      expect(Math.abs(coarseEnd.queens - exactEnd.queens)).toBeLessThanOrEqual(1);
      expect(relativeError(coarseEnd.drones, exactEnd.drones)).toBeLessThan(UNIT_TOLERANCE);
      expect(relativeError(coarseEnd.soldiers, exactEnd.soldiers)).toBeLessThan(UNIT_TOLERANCE);
    });
  });

  // Die Instrumentierung verfälscht die Messung und macht die 24-h-Läufe sehr teuer.
  describe.skipIf(isCoverageRun())('Leistung', () => {
    // Wiederholungen fangen Lastspitzen paralleler Prozesse ab; gemessen wird die erreichbare Zeit.
    it.each([
      ['Aktiv', createActiveBot],
      ['Idle', createIdleBot],
    ])('simuliert 24 h für %s im Budget', { timeout: 60_000, retry: 2 }, (_name, createBot) => {
      const start = performance.now();
      const { samples } = run(createBot(), { durationMs: 24 * HOUR_MS });
      expect(performance.now() - start).toBeLessThan(BUDGET_MS);
      expect(samples).toHaveLength(24 * 60 + 1);
    });
  });
});
