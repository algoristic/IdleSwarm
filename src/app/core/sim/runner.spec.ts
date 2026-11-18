import { BalanceParams, DEFAULT_BALANCE, TICK_MS } from '../balance/constants';
import type { Command } from '../rules/commands';
import { createActiveBot } from './bots/active';
import type { Bot } from './bots/bot';
import { createIdleBot } from './bots/idle';
import {
  BUY_GAP_WINDOW_MS,
  DEFAULT_SIM_STEP_MS,
  runSimulation,
  SimOptions,
  SimResult,
} from './runner';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const BUDGET_MS = 5000;

/** Toleranzen des großen Schritts gegenüber dem echten 100-ms-Takt. */
const SITE_TOLERANCE = 0.005;
const UNIT_TOLERANCE = 0.01;

const BUY_DRONE: Command = { type: 'buy', unit: 'drones' };

/** Ohne Königin keine Brut, ohne Preisfaktor konstante Preise: alles bleibt nachrechenbar. */
const SIMPLE: Partial<BalanceParams> = {
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
      expect(result.events.some((event) => event.type === 'newSite')).toBe(true);
      expect(run(createBot(), options)).toEqual(result);
    });

    it('nutzt weder Uhr noch globalen Zufall', () => {
      const random = vi.spyOn(Math, 'random');
      const clock = vi.spyOn(Date, 'now');
      run(createActiveBot());
      expect(random).not.toHaveBeenCalled();
      expect(clock).not.toHaveBeenCalled();
    });

    it('hängt nicht vom Seed ab, solange die Spiellogik keinen Zufall zieht', () => {
      const first = run(createActiveBot(), { seed: 'eins' });
      const second = run(createActiveBot(), { seed: 'zwei' });
      expect(second.seed).toBe('zwei');
      expect({ ...second, seed: first.seed }).toEqual(first);
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
      // Eine Drohne, 0 Nahrung, 0,2 Nahrung/s: Fehlbetrag / Zufluss je Einheitentyp.
      const { samples } = run(scripted({ 0: [BUY_DRONE] }), {
        params: { startQueens: 0, startFood: 10 },
      });
      const { nextBuyMs, netFoodPerSecond } = samples[0];
      expect(netFoodPerSecond).toBeCloseTo(0.2, 10);
      expect(nextBuyMs.drones).toBeCloseTo(53_500, 6);
      expect(nextBuyMs.soldiers).toBeCloseTo(125_000, 6);
      expect(nextBuyMs.queens).toBeCloseTo(300_000, 6);
      expect(nextBuyMs.total).toBeCloseTo(53_500, 6);
    });

    it('meldet 0 für bezahlbare Käufe', () => {
      const { nextBuyMs } = run(scripted({}), { params: SIMPLE }).samples[0];
      expect(nextBuyMs).toEqual({ queens: 0, drones: 0, soldiers: 0, total: 0 });
    });

    it('meldet null, wenn der Kauf beim aktuellen Zufluss nie erreicht wird', () => {
      // Eine Königin ohne Drohnen: Der Nettozufluss ist negativ.
      const { nextBuyMs, netFoodPerSecond } = run(scripted({}), {
        params: { startFood: 0 },
      }).samples[0];
      expect(netFoodPerSecond).toBeCloseTo(-1.375, 10);
      expect(nextBuyMs).toEqual({ queens: null, drones: null, soldiers: null, total: null });
    });

    it('zählt Soldaten nicht zur Gesamtzeit', () => {
      // Soldat bezahlbar, Drohne und Königin nicht.
      const { nextBuyMs } = run(scripted({}), {
        params: { startQueens: 0, startFood: 30, droneCost: 40 },
      }).samples[0];
      expect(nextBuyMs.soldiers).toBe(0);
      expect(nextBuyMs.total).toBeNull();
    });
  });

  describe('Ereignisse und Futterstellen', () => {
    const cycle = () =>
      run(scripted({ 0: Array(5).fill(BUY_DRONE), 120_000: [{ type: 'newSite' }] }), {
        params: { ...SIMPLE, siteSize: 100 },
        durationMs: 5 * MINUTE_MS,
        // Der grobe Schritt prüft, dass der Zeitpunkt nicht an der Schrittweite hängt.
        stepMs: 30_000,
      });

    it('hält Käufe, leere und neue Futterstellen mit Zeitstempel fest', () => {
      expect(cycle().events).toEqual([
        ...Array.from({ length: 5 }, () => ({ timeMs: 0, type: 'buy', unit: 'drones' })),
        { timeMs: 100_000, type: 'siteEmpty', site: 0 },
        { timeMs: 120_000, type: 'newSite', site: 1 },
        { timeMs: 220_000, type: 'siteEmpty', site: 1 },
      ]);
    });

    it('misst die Dauer je Futterstelle ohne die Zeit bis zur Erneuerung', () => {
      const { sites, firstSiteMs } = cycle().metrics;
      expect(firstSiteMs).toBe(100_000);
      expect(sites).toEqual([
        { index: 0, startMs: 0, emptyMs: 100_000, durationMs: 100_000 },
        { index: 1, startMs: 120_000, emptyMs: 220_000, durationMs: 100_000 },
      ]);
    });

    it('lässt eine nicht geleerte Futterstelle offen', () => {
      const { sites, firstSiteMs } = run(scripted({}), { params: SIMPLE }).metrics;
      expect(firstSiteMs).toBeNull();
      expect(sites).toEqual([{ index: 0, startMs: 0, emptyMs: null, durationMs: null }]);
    });

    it('erkennt einen Klick, der den Vorrat leert', () => {
      const { events } = run(scripted({ 5000: [{ type: 'click' }] }), {
        params: { ...SIMPLE, siteSize: 1 },
      });
      expect(events).toEqual([{ timeMs: 5000, type: 'siteEmpty', site: 0 }]);
    });

    it('ignoriert wirkungslose Kommandos', () => {
      const { events } = run(
        scripted({ 0: [{ type: 'newSite' }, { type: 'buy', unit: 'queens' }, { type: 'noop' }] }),
        { params: { startFood: 0 } },
      );
      expect(events).toEqual([]);
    });

    it.each([
      ['Aktiv', createActiveBot],
      ['Idle', createIdleBot],
    ])('wechselt bei %s leere und neue Futterstellen ab', (_name, createBot) => {
      const { events, metrics } = run(createBot(), {
        params: { siteSize: 500 },
        durationMs: 20 * MINUTE_MS,
      });
      const cycle = events.filter((event) => event.type !== 'buy');
      expect(metrics.sites.length).toBeGreaterThan(2);
      cycle.forEach((event, index) => {
        const site = Math.ceil(index / 2);
        expect(event).toMatchObject({
          type: index % 2 === 0 ? 'siteEmpty' : 'newSite',
          site,
        });
      });
      const times = events.map((event) => event.timeMs);
      expect(times).toEqual([...times].sort((a, b) => a - b));
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
      // 5 Nahrung, nach 5 s bringt ein Klick 5 dazu: Die Drohne zu 10 ist ab dann bezahlbar.
      const { waitShare } = run(scripted({ 5000: [{ type: 'click' }] }), {
        params: { startQueens: 0, startFood: 5, clickYield: 5 },
        durationMs: 20_000,
        sampleEveryMs: 20_000,
      }).metrics;
      expect(waitShare).toBeCloseTo(0.25, 10);
    });

    it('wertet einen bezahlbaren Soldaten nicht als Ende der Wartezeit', () => {
      const { waitShare } = run(scripted({}), {
        params: { startQueens: 0, startFood: 30, droneCost: 40 },
      }).metrics;
      expect(waitShare).toBe(1);
    });

    describe('längste Wartestrecke', () => {
      /** Ohne Brut und Sammeln ändert sich die Nahrung nur durch Klicks und Käufe. */
      const STATIC: Partial<BalanceParams> = {
        startQueens: 0,
        droneCollectRate: 0,
        droneCostGrowth: 1,
      };
      const CLICK: Command = { type: 'click' };

      it('nimmt die längste zusammenhängende Strecke', () => {
        // Wartet 0–5 s, ist bis 8 s versorgt, wartet nach dem Kauf 8–30 s, danach nicht mehr.
        const { longestWaitMs, waitShare } = run(
          scripted({
            5000: [CLICK],
            8000: [BUY_DRONE],
            20_000: [CLICK],
            30_000: [CLICK],
          }),
          {
            params: { ...STATIC, startFood: 5, clickYield: 5 },
            durationMs: 40_000,
            sampleEveryMs: 40_000,
          },
        ).metrics;
        expect(longestWaitMs).toBe(22_000);
        expect(waitShare).toBeCloseTo(27 / 40, 10);
      });

      it('hängt nicht an der Schrittweite, solange Aktionen die Strecke begrenzen', () => {
        const { longestWaitMs } = run(scripted({ 5000: [CLICK] }), {
          params: { ...STATIC, startFood: 5, clickYield: 5 },
          durationMs: 60_000,
          stepMs: 7000,
        }).metrics;
        expect(longestWaitMs).toBe(5000);
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

    it('hat ohne Sammelrate keine Verdopplungszeit', () => {
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
      expect(coarseEnd.queens).toBe(exactEnd.queens);
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
