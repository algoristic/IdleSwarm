import type { Num } from '@app/shared/util/num/num';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';
import type { CandidateStatus } from '@app/site/domain/models/map.model';
import type { DepartureBlocker } from '@app/site/domain/move-logic';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

/** Urteil über ein Ziel (US-04.03, US-04.04); die Oberfläche bildet es auf Texte ab. */
export const TARGET_VERDICTS = ['capturable', 'too-strong', 'out-of-range', 'unexplored'] as const;

export type TargetVerdict = (typeof TARGET_VERDICTS)[number];

/** Warum der Knopf „Aufbrechen“ gesperrt ist; `unexplored` trennt die Umgebung von `out-of-range`. */
export type TargetBlocker = DepartureBlocker | 'unexplored';

/**
 * Menge mit dem angezeigten Wert als Zahl für die ICU-Mehrzahl. `shown` ist so gerundet wie die
 * Pipe, mit der das Template `amount` zeigt (`formatUp` bzw. `formatDown`).
 */
export interface CountView {
  readonly amount: Num;
  readonly shown: number;
}

/** Erwartete Verluste `L` an Soldaten (aufgerundet) und `L / S'` in Prozent (Game-Design §4.8). */
export interface ExpectedLosses {
  readonly soldiers: CountView;
  readonly percent: Num;
}

/** Werte eines wahrgenommenen Ziels (US-04.01, US-04.04); Rohwerte, gerundet wird im Template. */
export interface TargetDetails {
  readonly type: SiteTypeId;
  /** Größe = voller Nahrungsvorrat bei Ankunft, ungerundet. */
  readonly size: Num;
  readonly distance: number;
  readonly travelSeconds: Num;
  readonly defense: Num;
  readonly dna: Num;
  /** `false` bei Abwehr 0: Die sichere Futterstelle bringt keine DNA (US-04.02). */
  readonly rewardsDna: boolean;
  /** Fundchance in Prozent. */
  readonly findChancePercent: number;
  /** `A'` der mitkommenden Soldaten nach Transport. */
  readonly attack: Num;
  /** `null`, wenn das Ziel nicht einnehmbar ist: Dann gibt es keinen Kampf. */
  readonly losses: ExpectedLosses | null;
  /** Balken Angriff vs. Abwehr auf gemeinsamer Skala, je 0 bis 100. */
  readonly attackBarPercent: number;
  readonly defenseBarPercent: number;
}

export interface TargetView {
  /** Index in `map.candidates`; Ziel des Kommandos `depart`. */
  readonly index: number;
  readonly status: CandidateStatus;
  readonly verdict: TargetVerdict;
  /** Die gewählte Strategie würde dieses Ziel ansteuern (US-04.10). */
  readonly strategyChoice: boolean;
  readonly selected: boolean;
  /** Warum kein Aufbruch möglich ist; `null`, wenn er möglich ist. */
  readonly blocker: TargetBlocker | null;
  /** `null` bei unerforschten Zielen: Sie zeigen nur „?“ (US-04.03). */
  readonly details: TargetDetails | null;
}

/** Vorschau des Transports mit der aktuellen Priorität (US-04.06). */
export interface TransportView {
  readonly priority: TransportPriority;
  /** Abgerundet wie `formatDown`. */
  readonly carriedDrones: CountView;
  readonly carriedSoldiers: CountView;
  /** Aufgerundet wie `formatUp`; `null`, wenn angezeigt keine zurückbleiben. */
  readonly leftDrones: CountView | null;
  readonly leftSoldiers: CountView | null;
  readonly fitsAll: boolean;
}

/** Drohnen → Königin (US-04.08). */
export interface QueenConversionView {
  readonly drones: Num;
  /** `k_q` in Drohnen, aufgerundet wie `formatUp`; `null`, wenn keine Umwandlung möglich ist. */
  readonly price: CountView | null;
  readonly possible: boolean;
}
