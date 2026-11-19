import type { BalanceParams } from '@app/balance/domain/constants';
import type { SimEvent, SiteMetric } from '@app/engine/domain/runner-logic';
import { FIND_KINDS, FindKind } from '@app/finds/domain/models/finds.model';
import { nodeCost } from '@app/genome/domain/genome-logic';
import { GENOME_NODE_IDS } from '@app/genome/domain/models/genome.model';
import { MS_PER_HOUR } from '@app/shared/util/time/time-units';

import type { TimeRange } from './wait-share-logic';

/** Stichtag der Knotenzahl „nach 1 h“ (technisches Konzept §5.4). */
export const PROGRESS_CHECKPOINT_MS = MS_PER_HOUR;

/**
 * Neue Optionen für das Zielband „Neue Mechanik/Ansicht“ (Game-Design §6.3, entschieden mit M1.3):
 * der erste Drüsenpunkt, der erste Weiterzug, der erste Fund, jede Adaption, jede einzigartige
 * Adaption und jedes Badge.
 */
export const UNLOCK_KINDS = ['gland', 'move', 'find', 'adaptation', 'unique', 'badge'] as const;

export type UnlockKind = (typeof UNLOCK_KINDS)[number];

export interface Unlock {
  readonly kind: UnlockKind;
  readonly timeMs: number;
}

/** Freischalt-Zeitpunkte und Progressions-Kennzahlen eines Laufs (technisches Konzept §5.4). */
export interface ProgressMetrics {
  readonly firstFindMs: number | null;
  readonly firstAdaptationMs: number | null;
  readonly firstGlandMs: number | null;
  /** Ankunft am ersten Ziel mit Abwehr `B > 0`. */
  readonly firstCombatCaptureMs: number | null;
  /** Erster Aufbruch. */
  readonly firstMoveMs: number | null;
  readonly nodesAtCheckpoint: number;
  readonly nodesAtEnd: number;
  /** Zeitpunkt, zu dem der letzte reguläre Knoten entwickelt wurde; `null`, solange einer fehlt. */
  readonly genomeCompleteMs: number | null;
  readonly dnaFromCombat: number;
  readonly dnaFromFinds: number;
  readonly findCount: number;
  readonly findsByKind: Readonly<Record<FindKind, number>>;
  readonly uniqueCount: number;
  readonly badgeCount: number;
  readonly glandCount: number;
  /** Alle neuen Optionen des Laufs, zeitlich geordnet. */
  readonly unlocks: readonly Unlock[];
}

function firstTime(events: readonly SimEvent[], type: SimEvent['type']): number | null {
  return events.find((event) => event.type === type)?.timeMs ?? null;
}

/** Neue Optionen nach Game-Design §6.3, zeitlich geordnet (bei gleicher Zeit nach `UNLOCK_KINDS`). */
export function unlocksOf(events: readonly SimEvent[]): Unlock[] {
  const unlocks: Unlock[] = [];
  const firstOf = (type: SimEvent['type'], kind: UnlockKind): void => {
    const timeMs = firstTime(events, type);
    if (timeMs !== null) {
      unlocks.push({ kind, timeMs });
    }
  };
  firstOf('gland', 'gland');
  firstOf('departed', 'move');
  firstOf('found', 'find');
  for (const event of events) {
    if (event.type === 'evolved') {
      unlocks.push({ kind: 'adaptation', timeMs: event.timeMs });
    } else if (event.type === 'found') {
      if (event.unlocked !== null) {
        unlocks.push({ kind: 'unique', timeMs: event.timeMs });
      }
      if (event.badge !== null) {
        unlocks.push({ kind: 'badge', timeMs: event.timeMs });
      }
    }
  }
  return unlocks.sort(
    (a, b) => a.timeMs - b.timeMs || UNLOCK_KINDS.indexOf(a.kind) - UNLOCK_KINDS.indexOf(b.kind),
  );
}

/**
 * Größte Strecke ohne neue Option im Fenster `[0; windowMs]` (bzw. bis Laufende), einschließlich
 * Laufbeginn und Fensterende; bei Gleichstand die erste. Ohne Fenster (Dauer 0) `null`.
 */
export function longestUnlockGap(
  unlocks: readonly Unlock[],
  windowMs: number,
  durationMs: number,
): TimeRange | null {
  const endMs = Math.min(windowMs, durationMs);
  if (endMs <= 0) {
    return null;
  }
  const times = unlocks.map((unlock) => unlock.timeMs).filter((time) => time <= endMs);
  const bounds = [0, ...times, endMs];
  let best: TimeRange = { fromMs: 0, toMs: 0 };
  for (let i = 1; i < bounds.length; i++) {
    if (bounds[i] - bounds[i - 1] > best.toMs - best.fromMs) {
      best = { fromMs: bounds[i - 1], toMs: bounds[i] };
    }
  }
  return best;
}

/** Summe der Kosten aller regulären Knoten: die größte mögliche DNA-Ausgabe (US-10.07). */
export function genomeCostTotal(params: BalanceParams): number {
  return GENOME_NODE_IDS.reduce((sum, id) => sum + nodeCost(id, params).toNumber(), 0);
}

/** Kennzahlen aus den vollständigen Ereignissen und Futterstellen eines Laufs (vor dem Ausdünnen). */
export function progressMetrics(
  events: readonly SimEvent[],
  sites: readonly SiteMetric[],
): ProgressMetrics {
  const evolved = events.filter((event) => event.type === 'evolved');
  const found = events.filter((event) => event.type === 'found');
  const findsByKind = Object.fromEntries(FIND_KINDS.map((kind) => [kind, 0])) as Record<
    FindKind,
    number
  >;
  for (const event of found) {
    findsByKind[event.kind]++;
  }
  const complete = evolved.length >= GENOME_NODE_IDS.length;
  return {
    firstFindMs: firstTime(events, 'found'),
    firstAdaptationMs: firstTime(events, 'evolved'),
    firstGlandMs: firstTime(events, 'gland'),
    firstCombatCaptureMs: sites.find((site) => site.fought)?.startMs ?? null,
    firstMoveMs: firstTime(events, 'departed'),
    nodesAtCheckpoint: evolved.filter((event) => event.timeMs <= PROGRESS_CHECKPOINT_MS).length,
    nodesAtEnd: evolved.length,
    genomeCompleteMs: complete ? evolved[GENOME_NODE_IDS.length - 1].timeMs : null,
    dnaFromCombat: sites.reduce((sum, site) => sum + site.dna, 0),
    dnaFromFinds: found.reduce((sum, event) => sum + event.dna, 0),
    findCount: found.length,
    findsByKind,
    uniqueCount: found.filter((event) => event.unlocked !== null).length,
    badgeCount: found.filter((event) => event.badge !== null).length,
    glandCount: events.filter((event) => event.type === 'gland').length,
    unlocks: unlocksOf(events),
  };
}
