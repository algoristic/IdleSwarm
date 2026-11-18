import type { BalanceParams } from '../../balance/constants';
import {
  droneFoodPerSecond,
  eggsPerMinute,
  isAffordable,
  netFoodPerSecond,
  unitPrice,
} from '../../balance/formulas';
import { UNIT_TYPES, UnitType } from '../../data/units';
import type { Num } from '../../num/num';
import { apply, Command } from '../../rules/commands';
import type { GameState, Units } from '../../state/game-state';

/** Obergrenze je Entscheidung; hält Läufe mit Preis 0 aus `params` endlich. */
const MAX_BUYS_PER_DECISION = 1000;

export type UnitPrices = Readonly<Record<UnitType, Num>>;

/** Abgeleitete Werte zu einem Zustand; nichts davon liegt im State. */
export interface BotView {
  /** Spielzeit seit Laufbeginn. */
  readonly timeMs: number;
  readonly params: BalanceParams;
  readonly prices: UnitPrices;
  /** Nahrung/s der Drohnen. */
  readonly foodPerSecond: Num;
  /** Nahrung/s der Drohnen minus Brutkosten, ohne Klicks. */
  readonly netFoodPerSecond: Num;
  readonly eggsPerMinute: Num;
  /** Dieselbe Sicht auf einen anderen Zustand, etwa nach einem geplanten Kauf. */
  forState(state: GameState): BotView;
}

/**
 * Deterministische Spielweise (technisches Konzept §5.3). Der Runner ruft `decide` bei `t = 0` und
 * danach zu den Zeiten aus `nextActionMs` auf; so liegen Aktionen auch bei großen Schritten exakt.
 */
export interface Bot {
  readonly name: string;
  /** Nächster Aktionszeitpunkt nach `afterMs`; `Infinity`, wenn keiner mehr folgt. */
  nextActionMs(afterMs: number): number;
  decide(state: GameState, view: BotView): readonly Command[];
}

/** Preise je Einheitentyp; ändern sich nur mit `bought` und werden so wiederverwendet. */
export type PriceLookup = (bought: Units) => UnitPrices;

export function createPriceLookup(params: BalanceParams): PriceLookup {
  let pricedFor: Units | null = null;
  let prices: UnitPrices | null = null;
  return (bought) => {
    if (prices === null || pricedFor !== bought) {
      const [queens, drones, soldiers] = UNIT_TYPES.map((unit) => unitPrice(unit, bought, params));
      prices = { queens, drones, soldiers };
      pricedFor = bought;
    }
    return prices;
  };
}

/** Rechnet erst beim Zugriff; der Runner erzeugt je Aktion und Abtastung eine Sicht. */
class LazyBotView implements BotView {
  constructor(
    private readonly state: GameState,
    readonly timeMs: number,
    readonly params: BalanceParams,
    private readonly pricesFor: PriceLookup,
  ) {}

  get prices(): UnitPrices {
    return this.pricesFor(this.state.bought);
  }

  get foodPerSecond(): Num {
    return droneFoodPerSecond(this.state.units, this.state.site.stock, this.params);
  }

  get netFoodPerSecond(): Num {
    return netFoodPerSecond(this.state.units, this.state.site.stock, this.params);
  }

  get eggsPerMinute(): Num {
    return eggsPerMinute(this.state.units, this.params);
  }

  forState(state: GameState): BotView {
    return new LazyBotView(state, this.timeMs, this.params, this.pricesFor);
  }
}

export function createBotView(
  state: GameState,
  timeMs: number,
  params: BalanceParams,
  pricesFor: PriceLookup = createPriceLookup(params),
): BotView {
  return new LazyBotView(state, timeMs, params, pricesFor);
}

/** Nächstes Vielfaches von `intervalMs` nach `afterMs`. */
export function nextMultipleMs(afterMs: number, intervalMs: number): number {
  return (Math.floor(afterMs / intervalMs) + 1) * intervalMs;
}

export function assertPositiveInterval(name: string, valueMs: number): void {
  if (!Number.isFinite(valueMs) || valueMs <= 0) {
    throw new RangeError(`${name}: ungültiges Intervall ${valueMs}`);
  }
}

/** Sammelt Kommandos und wendet sie vorab auf eine Kopie an, damit Folgeentscheidungen stimmen. */
export class CommandPlan {
  readonly commands: Command[] = [];
  #buys = 0;
  #view: BotView;

  constructor(
    private current: GameState,
    view: BotView,
  ) {
    this.#view = view;
  }

  get state(): GameState {
    return this.current;
  }

  get view(): BotView {
    return this.#view;
  }

  add(command: Command): void {
    this.commands.push(command);
    this.current = apply(this.current, command, this.#view.params);
    this.#view = this.#view.forState(this.current);
  }

  renewEmptySite(): void {
    if (this.current.site.stock.isZero()) {
      this.add({ type: 'newSite' });
    }
  }

  canBuy(unit: UnitType): boolean {
    return (
      this.#buys < MAX_BUYS_PER_DECISION &&
      isAffordable(this.#view.prices[unit], this.current.res.food)
    );
  }

  buy(unit: UnitType): void {
    this.#buys++;
    this.add({ type: 'buy', unit });
  }
}
