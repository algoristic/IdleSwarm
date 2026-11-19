import type { StrategyId } from '@app/site/domain/models/auto-move.model';
import type { TransportPriority } from '@app/swarm/domain/models/transport-priority.model';

import type { TargetBlocker, TargetVerdict } from '../models/target.model';

/** Namen der Strategien (Game-Design §4.12, US-04.10). */
export const STRATEGY_LABELS: Readonly<Record<StrategyId, string>> = {
  'least-resistance': $localize`:@@uiSonar-sonarLabels-strategy-leastResistance:Geringster Widerstand`,
  balanced: $localize`:@@uiSonar-sonarLabels-strategy-balanced:Ausgewogen`,
  'battle-hardened': $localize`:@@uiSonar-sonarLabels-strategy-battleHardened:Kampfgehärtet`,
};

/** Namen der Mitnahme-Prioritäten (Game-Design §4.9, US-04.06). */
export const PRIORITY_LABELS: Readonly<Record<TransportPriority, string>> = {
  'drones-first': $localize`:@@uiSonar-sonarLabels-priority-dronesFirst:Drohnen zuerst`,
  'soldiers-first': $localize`:@@uiSonar-sonarLabels-priority-soldiersFirst:Soldaten zuerst`,
  balanced: $localize`:@@uiSonar-sonarLabels-priority-balanced:Ausgewogen (prozentual)`,
};

/** Urteil je Ziel (Mockup K2, US-04.04). */
export const VERDICT_LABELS: Readonly<Record<TargetVerdict, string>> = {
  capturable: $localize`:@@uiSonar-sonarLabels-verdict-capturable:✓ einnehmbar`,
  'too-strong': $localize`:@@uiSonar-sonarLabels-verdict-tooStrong:✗ zu stark – mehr Soldaten nötig`,
  'out-of-range': $localize`:@@uiSonar-sonarLabels-verdict-outOfRange:✗ außer Reichweite`,
  unexplored: $localize`:@@uiSonar-sonarLabels-verdict-unexplored:? unerforscht`,
};

/** Grund, warum der Knopf „Aufbrechen“ gesperrt ist (Game-Design §4.11). */
export const BLOCKER_LABELS: Readonly<Record<TargetBlocker, string>> = {
  traveling: $localize`:@@uiSonar-sonarLabels-blocker-traveling:Der Schwarm ist schon unterwegs.`,
  'unknown-target': $localize`:@@uiSonar-sonarLabels-blocker-unknownTarget:Dieses Ziel gibt es nicht mehr.`,
  'out-of-range': $localize`:@@uiSonar-sonarLabels-blocker-outOfRange:Das Ziel liegt außer Reichweite.`,
  unexplored: $localize`:@@uiSonar-sonarLabels-blocker-unexplored:Das Ziel ist unerforscht und lässt sich noch nicht ansteuern.`,
  'too-strong': $localize`:@@uiSonar-sonarLabels-blocker-tooStrong:Die Abwehr ist zu stark. Mehr Soldaten nötig oder eine andere Priorität wählen.`,
};

/** Textfarbe je Urteil; vollständige Klassennamen, damit Tailwind sie findet. */
export const VERDICT_TONES: Readonly<Record<TargetVerdict, string>> = {
  capturable: 'text-accent',
  'too-strong': 'text-danger',
  'out-of-range': 'text-fg-muted',
  unexplored: 'text-fg-muted',
};

/** Füllfarbe der Ziele auf der Sonar-Karte je Urteil (US-04.12). */
export const VERDICT_FILLS: Readonly<Record<TargetVerdict, string>> = {
  capturable: 'fill-accent',
  'too-strong': 'fill-danger',
  'out-of-range': 'fill-fg-muted',
  unexplored: 'fill-fg-muted',
};

/** Linienfarbe von Halo und Rand der Ziele auf der Sonar-Karte je Urteil. */
export const VERDICT_STROKES: Readonly<Record<TargetVerdict, string>> = {
  capturable: 'stroke-accent',
  'too-strong': 'stroke-danger',
  'out-of-range': 'stroke-fg-muted',
  unexplored: 'stroke-fg-muted',
};
