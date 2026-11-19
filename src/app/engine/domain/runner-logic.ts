import { BalanceParams, DEFAULT_BALANCE } from '@app/balance/domain/constants';
import { isAffordable, secondsUntilAffordable, siteMsLeft } from '@app/balance/domain/formulas';
import { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { UnitType } from '@app/swarm/domain/models/units.model';

import {
  assertPositiveInterval,
  Bot,
  BotView,
  createBotView,
  createPriceLookup,
} from './bot-logic';
import { applyCommand, Command } from './commands-logic';
import { createInitialState } from './game-state-logic';
import type { GameEvent } from './models/game-event.model';
import { GameState } from './models/game-state.model';
import { step } from './step-logic';

/** Standard-Schrittweite; gegen den 100-ms-Takt abgesichert in `runner.spec.ts`. */
export const DEFAULT_SIM_STEP_MS = 1000;

/** Fenster der Kauflücken (Projektplan §3.5: „erste 30 min“). */
export const BUY_GAP_WINDOW_MS = 30 * 60_000;

/** Schützt Worker und Diagramme vor versehentlich riesigen Zeitreihen. */
const MAX_SAMPLES = 100_000;

const MS_PER_SECOND = 1000;

/** Soldaten nützen in M1.1 nichts; „gesamt“ und die Wartezeit zählen nur sinnvolle Käufe. */
const USEFUL_UNITS: readonly UnitType[] = ['queens', 'drones'];

export interface SimOptions {
  /** Geht in den Startzustand ein; der Generator zieht daraus die Kandidaten. */
  readonly seed: string;
  readonly bot: Bot;
  readonly durationMs: number;
  readonly sampleEveryMs: number;
  /** Teil-Override über `DEFAULT_BALANCE`. */
  readonly params?: Partial<BalanceParams>;
  /**
   * Längster Simulationsschritt; Bot-Aktionen, Abtastpunkte, Ankünfte und vorhergesagte
   * Auto-Aufbrüche teilen ihn zusätzlich.
   */
  readonly stepMs?: number;
  /** Unix-Zeit des Startzustands; alle Zeiten im Ergebnis zählen ab Laufbeginn. */
  readonly startTimeMs?: number;
}

/** Zeit bis zum Kauf in ms: 0 = sofort, `null` = beim aktuellen Nettozufluss nie. */
export interface NextBuyTimes {
  readonly queens: number | null;
  readonly drones: number | null;
  readonly soldiers: number | null;
  /** Kürzeste Zeit über Königin und Drohne; Soldaten zählen nicht (siehe `USEFUL_UNITS`). */
  readonly total: number | null;
}

/** Abtastpunkt, aufgenommen nach den Bot-Aktionen desselben Zeitpunkts. */
export interface SimSample {
  readonly timeMs: number;
  readonly food: number;
  readonly stock: number;
  readonly queens: number;
  readonly drones: number;
  readonly soldiers: number;
  /** Grundertrag und Sammeln. */
  readonly foodPerSecond: number;
  /** Grundertrag und Sammeln minus Brutkosten bei voller Eierrate. */
  readonly netFoodPerSecond: number;
  readonly eggsPerMinute: number;
  readonly nextBuyMs: NextBuyTimes;
}

/**
 * Ereignisse eines Laufs; `site` ist der Index in {@link SimMetrics.sites}. `departed` nennt die
 * verlassene Futterstelle und den Typ des Ziels, `arrived` die neue Futterstelle.
 */
export type SimEvent =
  | { readonly timeMs: number; readonly type: 'buy'; readonly unit: UnitType }
  | { readonly timeMs: number; readonly type: 'siteEmpty'; readonly site: number }
  | {
      readonly timeMs: number;
      readonly type: 'departed';
      readonly site: number;
      readonly target: SiteTypeId;
      readonly auto: boolean;
    }
  | {
      readonly timeMs: number;
      readonly type: 'arrived';
      readonly site: number;
      readonly siteType: SiteTypeId;
    };

/**
 * Futterstelle von ihrem Beginn (Ankunft, die erste bei 0) bis zum leeren Vorrat; ohne Ende
 * bleiben die Felder `null`.
 */
export interface SiteMetric {
  readonly index: number;
  readonly siteType: SiteTypeId;
  readonly startMs: number;
  readonly emptyMs: number | null;
  readonly durationMs: number | null;
}

export interface GapMetric {
  readonly count: number;
  readonly medianMs: number | null;
  readonly maxMs: number | null;
}

export interface DoublingMetric {
  readonly count: number;
  readonly medianMs: number | null;
  /** Letzte vollständige Verdopplung; zeigt, ob das Wachstum abflacht. */
  readonly lastMs: number | null;
}

export interface SimMetrics {
  readonly firstBuyMs: number | null;
  /** Lücken zwischen Kaufzeitpunkten; Käufe im selben Moment zählen als einer. */
  readonly buyGaps: GapMetric;
  readonly sites: readonly SiteMetric[];
  readonly firstSiteMs: number | null;
  /** Längste Strecke ohne Kauf, einschließlich Laufbeginn und Laufende. */
  readonly longestNoBuyMs: number;
  /** Zeitanteil (0–1), in dem weder Königin noch Drohne bezahlbar ist. */
  readonly waitShare: number;
  /**
   * Längste zusammenhängende Wartestrecke innerhalb von `BUY_GAP_WINDOW_MS`, am Fensterende
   * abgeschnitten. Misst anders als `buyGaps` nicht den Besuchsabstand eines Bots.
   */
  readonly longestWaitMs: number;
  /** Verdopplungen der Nahrung/s, zwischen den Abtastpunkten logarithmisch interpoliert. */
  readonly foodRateDoubling: DoublingMetric;
}

/**
 * Ergebnis eines Laufs; nur JSON-Werte, also per `postMessage` und `JSON.stringify` übertragbar.
 * Beträge jenseits des `number`-Bereichs werden auf `±Number.MAX_VALUE` begrenzt und setzen
 * `saturated`, denn `Infinity` wäre in JSON `null`.
 */
export interface SimResult {
  readonly seed: string;
  readonly bot: string;
  readonly durationMs: number;
  readonly sampleEveryMs: number;
  readonly stepMs: number;
  readonly startTimeMs: number;
  readonly params: BalanceParams;
  readonly saturated: boolean;
  readonly samples: readonly SimSample[];
  readonly events: readonly SimEvent[];
  readonly metrics: SimMetrics;
}

function median(sorted: readonly number[]): number | null {
  if (sorted.length === 0) {
    return null;
  }
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function ascending(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function gapsBetween(times: readonly number[]): number[] {
  return times.slice(1).map((time, index) => time - times[index]);
}

/** Zeitpunkte mit mindestens einem Kauf, aufsteigend. */
function buyTimes(events: readonly SimEvent[]): number[] {
  const times = events.filter((event) => event.type === 'buy').map((event) => event.timeMs);
  return [...new Set(times)];
}

function buyGapMetric(times: readonly number[]): GapMetric {
  const gaps = ascending(gapsBetween(times.filter((time) => time <= BUY_GAP_WINDOW_MS)));
  return {
    count: gaps.length,
    medianMs: median(gaps),
    maxMs: gaps.length > 0 ? gaps[gaps.length - 1] : null,
  };
}

function longestNoBuy(times: readonly number[], durationMs: number): number {
  return Math.max(...gapsBetween([0, ...times, durationMs]));
}

/** Zeitpunkte, zu denen die Rate das Doppelte des jeweils letzten Niveaus erreicht. */
function doublingTimes(samples: readonly SimSample[]): number[] {
  const rated = samples.filter((sample) => sample.foodPerSecond > 0);
  if (rated.length === 0) {
    return [];
  }
  const times = [rated[0].timeMs];
  let target = rated[0].foodPerSecond * 2;
  for (let i = 1; i < rated.length; i++) {
    const from = rated[i - 1];
    const to = rated[i];
    const span = Math.log(to.foodPerSecond / from.foodPerSecond);
    while (Number.isFinite(target) && to.foodPerSecond >= target) {
      const share = Math.log(target / from.foodPerSecond) / span;
      times.push(from.timeMs + share * (to.timeMs - from.timeMs));
      target *= 2;
    }
  }
  return times;
}

function doublingMetric(samples: readonly SimSample[]): DoublingMetric {
  const gaps = gapsBetween(doublingTimes(samples));
  return {
    count: gaps.length,
    medianMs: median(ascending(gaps)),
    lastMs: gaps.length > 0 ? gaps[gaps.length - 1] : null,
  };
}

/** Sammelt Zeitreihen, Ereignisse und Futterstellen eines Laufs. */
class Recorder {
  readonly samples: SimSample[] = [];
  readonly events: SimEvent[] = [];
  readonly sites: SiteMetric[];
  saturated = false;
  private waitMs = 0;
  private currentWaitMs = 0;
  private longestWaitMs = 0;

  constructor(firstSiteType: SiteTypeId) {
    this.sites = [
      { index: 0, siteType: firstSiteType, startMs: 0, emptyMs: null, durationMs: null },
    ];
  }

  /** Wertet den Abschnitt `[fromMs, toMs)` aus; `waiting` gilt für seinen Beginn. */
  segment(fromMs: number, toMs: number, waiting: boolean): void {
    if (waiting) {
      this.waitMs += toMs - fromMs;
    }
    if (fromMs >= BUY_GAP_WINDOW_MS) {
      return;
    }
    this.currentWaitMs = waiting
      ? this.currentWaitMs + Math.min(toMs, BUY_GAP_WINDOW_MS) - fromMs
      : 0;
    this.longestWaitMs = Math.max(this.longestWaitMs, this.currentWaitMs);
  }

  /** Wandelt in eine JSON-taugliche Zahl; siehe {@link SimResult}. */
  wire(value: Num): number {
    const result = value.toNumber();
    if (Number.isFinite(result)) {
      return result;
    }
    this.saturated = true;
    return result > 0 ? Number.MAX_VALUE : -Number.MAX_VALUE;
  }

  private nextBuyMs(unit: UnitType, state: GameState, view: BotView): number | null {
    const seconds = secondsUntilAffordable(
      view.prices[unit],
      state.res.food,
      view.netFoodPerSecond,
    );
    return seconds === null ? null : this.wire(seconds.mul(MS_PER_SECOND));
  }

  sample(state: GameState, view: BotView): void {
    const { res, site, units } = state;
    const queens = this.nextBuyMs('queens', state, view);
    const drones = this.nextBuyMs('drones', state, view);
    const useful = [queens, drones].filter((time) => time !== null);
    this.samples.push({
      timeMs: view.timeMs,
      food: this.wire(res.food),
      stock: this.wire(site.stock),
      queens: this.wire(units.queens),
      drones: this.wire(units.drones),
      soldiers: this.wire(units.soldiers),
      foodPerSecond: this.wire(view.foodPerSecond),
      netFoodPerSecond: this.wire(view.netFoodPerSecond),
      eggsPerMinute: this.wire(view.eggsPerMinute),
      nextBuyMs: {
        queens,
        drones,
        soldiers: this.nextBuyMs('soldiers', state, view),
        total: useful.length > 0 ? Math.min(...useful) : null,
      },
    });
  }

  /** Hält einen wirksamen Kauf des Bots fest; wirkungslose Kommandos kommen hier nicht an. */
  command(command: Command, timeMs: number): void {
    if (command.type === 'buy') {
      this.events.push({ timeMs, type: 'buy', unit: command.unit });
    }
  }

  /** Übernimmt Ereignisse aus Kommandos und Schritten; `playedMs` zählt wie `timeMs` ab Laufbeginn. */
  gameEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      const last = this.sites.length - 1;
      const timeMs = event.playedMs;
      switch (event.type) {
        case 'siteDepleted': {
          const current = this.sites[last];
          this.sites[last] = { ...current, emptyMs: timeMs, durationMs: timeMs - current.startMs };
          this.events.push({ timeMs, type: 'siteEmpty', site: last });
          break;
        }
        case 'departed':
          this.events.push({
            timeMs,
            type: 'departed',
            site: last,
            target: event.siteType,
            auto: event.auto,
          });
          break;
        case 'arrived': {
          const index = last + 1;
          const { siteType } = event;
          this.sites.push({ index, siteType, startMs: timeMs, emptyMs: null, durationMs: null });
          this.events.push({ timeMs, type: 'arrived', site: index, siteType });
          break;
        }
      }
    }
  }

  metrics(durationMs: number): SimMetrics {
    const times = buyTimes(this.events);
    return {
      firstBuyMs: times.length > 0 ? times[0] : null,
      buyGaps: buyGapMetric(times),
      sites: this.sites,
      firstSiteMs: this.sites[0].durationMs,
      longestNoBuyMs: longestNoBuy(times, durationMs),
      waitShare: durationMs > 0 ? this.waitMs / durationMs : 0,
      longestWaitMs: this.longestWaitMs,
      foodRateDoubling: doublingMetric(this.samples),
    };
  }
}

/**
 * Nächster Zeitpunkt, an dem der Runner den Schritt teilt: die Ankunft oder der vorhergesagte
 * Auslöser des Auto-Weiterziehens (`V = θ · G`), auf die nächste ganze Millisekunde aufgerundet. Im
 * Schritt ist die Abbaurate konstant, die Vorhersage also exakt; so bricht der Schwarm nicht erst
 * am Ende eines großen Schritts auf.
 */
function nextSplitMs(state: GameState, timeMs: number, params: BalanceParams): number {
  const { auto, site, travel, units } = state;
  if (travel !== null) {
    return timeMs + Math.max(1, Math.ceil(travel.remainingMs));
  }
  if (!auto.enabled) {
    return Infinity;
  }
  const msLeft = siteMsLeft(units, site.stock.sub(site.size.mul(auto.threshold)), params);
  // Ist der Auslöser schon erreicht, fand die Strategie kein Ziel; dann gibt es nichts zu teilen.
  return msLeft !== null && msLeft > 0 ? timeMs + Math.ceil(msLeft) : Infinity;
}

function assertOptions(durationMs: number, sampleEveryMs: number, stepMs: number): void {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    throw new RangeError(`runSimulation: ungültige Dauer ${durationMs}`);
  }
  assertPositiveInterval('runSimulation: sampleEveryMs', sampleEveryMs);
  assertPositiveInterval('runSimulation: stepMs', stepMs);
  if (durationMs / sampleEveryMs >= MAX_SAMPLES) {
    throw new RangeError(`runSimulation: mehr als ${MAX_SAMPLES} Abtastpunkte`);
  }
}

/**
 * Simuliert einen Lauf ohne Oberfläche, ausschließlich über `applyCommand`, `step` und
 * `balance/domain`.
 * Gleiche Optionen ergeben dasselbe Ergebnis.
 *
 * Der Lauf hält an jeder Schrittgrenze, Bot-Aktion und Abtastung. Zu einem Zeitpunkt handelt zuerst
 * der Bot, dann wird abgetastet, dann läuft die Zeit weiter.
 *
 * @throws RangeError bei ungültigen Zeitangaben oder wenn ein Bot keinen späteren Zeitpunkt nennt.
 */
export function runSimulation(options: SimOptions): SimResult {
  const { seed, bot, durationMs, sampleEveryMs } = options;
  const { stepMs = DEFAULT_SIM_STEP_MS, startTimeMs = 0 } = options;
  assertOptions(durationMs, sampleEveryMs, stepMs);

  const params: BalanceParams = { ...DEFAULT_BALANCE, ...options.params };
  const pricesFor = createPriceLookup(params);
  const viewAt = (current: GameState, atMs: number): BotView =>
    createBotView(current, atMs, params, pricesFor);
  let state = createInitialState({ seed, now: startTimeMs }, params);
  const recorder = new Recorder(state.site.type);
  let timeMs = 0;
  let nextActionMs = 0;
  let sampleIndex = 0;

  for (;;) {
    if (timeMs === nextActionMs) {
      for (const command of bot.decide(state, viewAt(state, timeMs))) {
        const result = applyCommand(state, command, params);
        if (result.state !== state) {
          recorder.command(command, timeMs);
          recorder.gameEvents(result.events);
          state = result.state;
        }
      }
      nextActionMs = bot.nextActionMs(timeMs);
      if (!(nextActionMs > timeMs)) {
        throw new RangeError(`runSimulation: Bot ${bot.name} nennt keinen späteren Zeitpunkt`);
      }
    }

    const nextSampleMs = Math.min(sampleIndex * sampleEveryMs, durationMs);
    if (timeMs === nextSampleMs) {
      recorder.sample(state, viewAt(state, timeMs));
      sampleIndex++;
    }
    if (timeMs >= durationMs) {
      break;
    }

    const stepEndMs = (Math.floor(timeMs / stepMs) + 1) * stepMs;
    const stopMs = Math.min(
      stepEndMs > timeMs ? stepEndMs : timeMs + stepMs,
      nextActionMs,
      Math.min(sampleIndex * sampleEveryMs, durationMs),
      nextSplitMs(state, timeMs, params),
    );
    const dtMs = stopMs - timeMs;

    const prices = pricesFor(state.bought);
    const { food } = state.res;
    recorder.segment(
      timeMs,
      stopMs,
      !USEFUL_UNITS.some((unit) => isAffordable(prices[unit], food)),
    );

    const result = step(state, dtMs, params);
    recorder.gameEvents(result.events);
    state = result.state;
    timeMs = stopMs;
  }

  return {
    seed,
    bot: bot.name,
    durationMs,
    sampleEveryMs,
    stepMs,
    startTimeMs,
    params,
    saturated: recorder.saturated,
    samples: recorder.samples,
    events: recorder.events,
    metrics: recorder.metrics(durationMs),
  };
}
