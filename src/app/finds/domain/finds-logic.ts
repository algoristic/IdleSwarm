import type { BalanceParams } from '@app/balance/domain/constants';
import {
  buffExpiresAtMs,
  buffFactor,
  findDna,
  findEntryWeight,
  findFood,
  findSpreadFactor,
  harvestDrawCount,
  harvestThresholdStock,
  reachedHarvestThresholds,
  siteFindChance,
  siteMsLeft,
  weightedIndex,
} from '@app/balance/domain/formulas';
import type { Effect, Modifiers } from '@app/balance/domain/models/effect.model';
import type { GameState } from '@app/engine/domain/models/game-state.model';
import { fragmentProgress, isUniqueAdaptationUnlocked } from '@app/genome/domain/genome-logic';
import type { Num } from '@app/shared/util/num/num';
import { nextRandom, seedToRngState } from '@app/shared/util/rng/rng';

import { isCollectibleCollected, isSetComplete } from './collection-logic';
import {
  FIND_ENTRIES_BY_SITE,
  FIND_ENTRY_BY_ID,
  FRAGMENT_ADAPTATIONS,
} from './data/finds-era1.data';
import type { FindsEvent, FindsResult, FoundEvent } from './models/finds-event.model';
import type {
  BuffId,
  CollectedId,
  FindBuff,
  FindEntry,
  Finds,
  FindTrigger,
} from './models/finds.model';
import { BUFF_IDS, FOREIGN_DNA } from './models/finds.model';

/**
 * Zusatz zum Seed für den eigenen Fund-RNG (Game-Design §4.16). Ohne ihn begänne der Fund-Strom
 * beim selben Zustand wie der Generator und wiederholte dessen Zufallsfolge. Spielstände hängen
 * davon ab; der Wert darf sich nicht ändern.
 */
const FINDS_SEED_SUFFIX = '#finds';

const NO_EFFECTS: readonly Effect[] = Object.freeze([]);
const NO_EVENTS: readonly FindsEvent[] = Object.freeze([]);

/** Startzustand des Fund-RNG, abgeleitet aus dem Seed (Game-Design §4.16, §5.1). */
export function findsRngState(seed: string): number {
  return seedToRngState(`${seed}${FINDS_SEED_SUFFIX}`);
}

/** Fundzustand eines neuen Spiels: Zähler 0, nichts gesammelt, keine Buffs (Game-Design §2.1). */
export function initialFinds(seed: string): Finds {
  return { rngState: findsRngState(seed), total: 0, collected: {}, buffs: [] };
}

/** Ein Buff wirkt, solange `t_Spiel < Ablauf` (Game-Design §4.16). */
export function isBuffActive(buff: FindBuff, playedMs: number): boolean {
  return buff.expiresAtMs > playedMs;
}

/**
 * Effekte der laufenden Buffs (Game-Design §4.13, §4.16): `mul ×μ_B` auf das Ziel des Buffs, je
 * Buff-ID einmal. Abgelaufene Einträge wirken nicht, auch wenn sie noch im Zustand stehen.
 */
export function buffEffects(
  finds: Finds,
  playedMs: number,
  params: BalanceParams,
): readonly Effect[] {
  const effects: Effect[] = [];
  for (const id of BUFF_IDS) {
    const buff = finds.buffs.find((candidate) => candidate.id === id);
    const entry = FIND_ENTRY_BY_ID[id];
    if (buff !== undefined && isBuffActive(buff, playedMs) && entry.kind === 'buff') {
      effects.push({ ...entry.effect, value: buffFactor(id, params) });
    }
  }
  return effects.length === 0 ? NO_EFFECTS : effects;
}

/**
 * Entfernt abgelaufene Buffs (`Ablauf ≤ time.played`); ohne abgelaufenen Eintrag kommt derselbe
 * Zustand zurück (Game-Design §4.16, §5.1).
 */
export function pruneBuffs(state: GameState): GameState {
  const { finds, time } = state;
  const buffs = finds.buffs.filter((buff) => isBuffActive(buff, time.played));
  return buffs.length === finds.buffs.length ? state : { ...state, finds: { ...finds, buffs } };
}

/** Nächster Ablauf eines laufenden Buffs in Spielzeit; `null` ohne laufenden Buff. */
export function nextBuffExpiryMs(finds: Finds, playedMs: number): number | null {
  let next: number | null = null;
  for (const buff of finds.buffs) {
    if (isBuffActive(buff, playedMs) && (next === null || buff.expiresAtMs < next)) {
      next = buff.expiresAtMs;
    }
  }
  return next;
}

/** Nächste noch nicht erreichte Abbau-Schwelle und die Zeit bis dorthin (Game-Design §4.16). */
export interface HarvestThreshold {
  /** Schwelle `j` (1 … `n_A`). */
  readonly threshold: number;
  /** Vorrat an der Schwelle, `G · (n_A − j) / n_A`. */
  readonly stock: Num;
  /** Zeit bis zur Schwelle bei der aktuellen Abbaurate. */
  readonly msLeft: number;
}

/**
 * Nächste Abbau-Schwelle der aktuellen Futterstelle; `null` während einer Reise, wenn alle
 * Schwellen erreicht sind oder ohne Abbaurate. Im Schritt ist die Abbaurate konstant, der
 * Zeitpunkt also exakt.
 */
export function nextHarvestThreshold(
  state: GameState,
  params: BalanceParams,
  modifiers: Modifiers,
): HarvestThreshold | null {
  const { site, travel, units } = state;
  if (travel !== null) {
    return null;
  }
  const threshold = reachedHarvestThresholds(site.size, site.stock, params) + 1;
  if (threshold > harvestDrawCount(params)) {
    return null;
  }
  const stock = harvestThresholdStock(site.size, threshold, params);
  const msLeft = siteMsLeft(units, site.stock.sub(stock), params, modifiers);
  return msLeft === null ? null : { threshold, stock, msLeft };
}

/**
 * Hat der Eintrag sein Ziel schon erreicht? Ein Fragment, wenn seine einzigartige Adaption frei
 * ist, ein Sammelobjekt, wenn es gesammelt ist (Game-Design §4.16). Andere Arten nie.
 */
export function isFindTargetReached(
  finds: Finds,
  entry: FindEntry,
  params: BalanceParams,
): boolean {
  switch (entry.kind) {
    case 'fragment':
      return isUniqueAdaptationUnlocked(finds, FRAGMENT_ADAPTATIONS[entry.id], params);
    case 'collectible':
      return isCollectibleCollected(finds, entry.id);
    default:
      return false;
  }
}

function withCount(finds: Finds, id: CollectedId): Finds {
  return { ...finds, collected: { ...finds.collected, [id]: (finds.collected[id] ?? 0) + 1 } };
}

/** Setzt oder verlängert den Buff; die Einträge bleiben in der Reihenfolge von `BUFF_IDS`. */
function withBuff(finds: Finds, id: BuffId, expiresAtMs: number): Finds {
  const others = finds.buffs.filter((buff) => buff.id !== id);
  const buffs = [...others, { id, expiresAtMs }].sort(
    (a, b) => BUFF_IDS.indexOf(a.id) - BUFF_IDS.indexOf(b.id),
  );
  return { ...finds, buffs };
}

/**
 * Eine Ziehung (Game-Design §4.16) für die aktuelle Futterstelle zur Spielzeit `time.played`:
 * genau drei Zufallszahlen `r_1`, `r_2`, `r_3` aus dem eigenen Strom `finds.rngState`, auch ohne
 * Fund; der Generator-RNG `rngState` bleibt unberührt.
 *
 * - Fund, wenn `r_1 < p = min(1, p_Typ · M_fund)`.
 * - Eintrag: gewichtete Ziehung mit `r_2` über die Einträge am Typ; der erste Fund des Spiels ist
 *   immer Fremde DNA, ein Eintrag mit erreichtem Ziel wird zu Fremder DNA mit demselben `u_F`.
 * - Mengen mit `u_F = 1 − σ_F + 2σ_F · r_3`.
 *
 * `threshold` ist die Abbau-Schwelle `j` bei `harvest`, sonst `null`. Ohne Fund kommt nur der
 * fortgeschriebene Fund-RNG zurück, ohne Ereignis.
 */
export function drawFind(
  state: GameState,
  trigger: FindTrigger,
  threshold: number | null,
  params: BalanceParams,
  modifiers: Modifiers,
): FindsResult {
  const first = nextRandom(state.finds.rngState);
  const second = nextRandom(first.rngState);
  const third = nextRandom(second.rngState);
  const { site, map, res, time } = state;
  const finds: Finds = { ...state.finds, rngState: third.rngState };
  if (!(first.value < siteFindChance(site.type, params, modifiers))) {
    return { state: { ...state, finds }, events: NO_EVENTS };
  }
  const entries = FIND_ENTRIES_BY_SITE[site.type];
  const drawn =
    entries[
      weightedIndex(
        second.value,
        entries.map((entry) => findEntryWeight(entry.id, params)),
      )
    ];
  const replaced =
    finds.total > 0 && drawn !== undefined && isFindTargetReached(finds, drawn, params)
      ? drawn
      : null;
  // Erster Fund des Spiels: unabhängig von `r_2` Fremde DNA (kein Ersatz).
  const entry =
    finds.total === 0 || replaced !== null || drawn === undefined
      ? FIND_ENTRY_BY_ID[FOREIGN_DNA]
      : drawn;
  const spread = findSpreadFactor(third.value, params);
  const counted: Finds = { ...finds, total: finds.total + 1 };
  const event: Omit<FoundEvent, 'amount' | 'buffExpiresAtMs' | 'fragment' | 'unlocked' | 'badge'> =
    {
      type: 'found',
      playedMs: time.played,
      siteType: site.type,
      trigger,
      threshold,
      entry: entry.id,
      kind: entry.kind,
      replaced: replaced === null ? null : replaced.id,
    };
  const none = { amount: null, buffExpiresAtMs: null, fragment: null, unlocked: null, badge: null };
  switch (entry.kind) {
    case 'dna': {
      const amount = findDna(map.moves, spread, params);
      return {
        state: { ...state, res: { ...res, dna: res.dna.add(amount) }, finds: counted },
        events: [{ ...event, ...none, amount }],
      };
    }
    case 'food': {
      const amount = findFood(site.size, spread, params);
      return {
        state: { ...state, res: { ...res, food: res.food.add(amount) }, finds: counted },
        events: [{ ...event, ...none, amount }],
      };
    }
    case 'buff': {
      const previous = finds.buffs.find((buff) => buff.id === entry.id);
      const expiresAtMs = buffExpiresAtMs(
        entry.id,
        previous?.expiresAtMs ?? null,
        time.played,
        params,
      );
      return {
        state: { ...state, finds: withBuff(counted, entry.id, expiresAtMs) },
        events: [{ ...event, ...none, buffExpiresAtMs: expiresAtMs }],
      };
    }
    case 'fragment': {
      const adaptation = FRAGMENT_ADAPTATIONS[entry.id];
      const next = withCount(counted, entry.id);
      const unlocked =
        !isUniqueAdaptationUnlocked(finds, adaptation, params) &&
        isUniqueAdaptationUnlocked(next, adaptation, params);
      return {
        state: { ...state, finds: next },
        events: [
          {
            ...event,
            ...none,
            fragment: fragmentProgress(next, adaptation, params),
            unlocked: unlocked ? adaptation : null,
          },
        ],
      };
    }
    case 'collectible': {
      const next = withCount(counted, entry.id);
      const badge = !isSetComplete(finds, entry.set) && isSetComplete(next, entry.set);
      return {
        state: { ...state, finds: next },
        events: [{ ...event, ...none, badge: badge ? entry.set : null }],
      };
    }
  }
}
