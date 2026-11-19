import type { BalanceParams } from '@app/balance/domain/constants';
import { isGenomeNodeId } from '@app/genome/domain/models/genome.model';
import {
  EFFECT_TARGET_LABELS,
  GENOME_NODE_LABELS,
  UNIQUE_ADAPTATION_LABELS,
} from '@app/genome/ui/genome-labels/genome-labels';
import { formatElapsed, formatShare } from '@app/shared/util/format/elapsed-format';
import { formatNum, formatRate } from '@app/shared/util/format/format';

import type {
  UpgradeCurrency,
  UpgradeEffect,
  UpgradeId,
  UpgradeKind,
  UpgradeRow,
  UpgradeTarget,
} from '../../domain/upgrade-logic';

const NO_VALUE = '–';

const T = {
  yes: $localize`:@@uiModel-upgradeRows-yes:ja`,
  no: $localize`:@@uiModel-upgradeRows-no:nein`,
  owned: $localize`:@@uiModel-upgradeRows-owned:entwickelt`,
  open: $localize`:@@uiModel-upgradeRows-open:offen`,
} as const;

const OTHER_LABELS: Readonly<Record<'gland' | 'queens' | 'drones', string>> = {
  gland: $localize`:@@uiModel-upgradeRows-gland:Nächster Drüsenpunkt`,
  queens: $localize`:@@uiModel-upgradeRows-queens:Königin`,
  drones: $localize`:@@uiModel-upgradeRows-drones:Drohne`,
};

const KIND_LABELS: Readonly<Record<UpgradeKind, string>> = {
  node: $localize`:@@uiModel-upgradeRows-kind-node:Genom`,
  unique: $localize`:@@uiModel-upgradeRows-kind-unique:Einzigartig`,
  gland: $localize`:@@uiModel-upgradeRows-kind-gland:Pheromone`,
  unit: $localize`:@@uiModel-upgradeRows-kind-unit:Einheit`,
};

const CURRENCY_LABELS: Readonly<Record<UpgradeCurrency, string>> = {
  dna: $localize`:@@uiModel-upgradeRows-currency-dna:DNA`,
  food: $localize`:@@uiModel-upgradeRows-currency-food:Nahrung`,
  fragments: $localize`:@@uiModel-upgradeRows-currency-fragments:Fragmente`,
};

const TARGET_LABELS: Readonly<Record<UpgradeTarget, string>> = {
  ...EFFECT_TARGET_LABELS,
  eggsPerMinute: $localize`:@@uiModel-upgradeRows-target-eggsPerMinute:Eier/min`,
  foodPerSecond: $localize`:@@uiModel-upgradeRows-target-foodPerSecond:Nahrung/s`,
};

type ValueFormat = 'rate' | 'count' | 'percent';

/**
 * Anzeige je Ziel wie im Detailpanel der Genom-Ansicht: Faktoren und Anteile als Prozent,
 * Sammelleistung als Prozent der Grundrate (je Drohne nur Hundertstel).
 */
const VALUE_FORMATS: Readonly<Record<Exclude<UpgradeTarget, 'fallenRecycling'>, ValueFormat>> = {
  collectRate: 'percent',
  broodRate: 'rate',
  findChance: 'percent',
  combatLoss: 'percent',
  sacrificeYield: 'percent',
  range: 'count',
  attackPerSoldier: 'rate',
  spacePerQueen: 'count',
  pheromonePoints: 'count',
  eggsPerMinute: 'rate',
  foodPerSecond: 'rate',
};

const PERCENT = 100;

export interface UpgradeRowView {
  readonly id: UpgradeId;
  readonly label: string;
  readonly kind: string;
  readonly status: string;
  readonly cost: string;
  readonly effects: readonly string[];
  readonly foodGain: string;
  readonly foodGainShare: string;
  readonly payback: string;
}

function upgradeLabel(id: UpgradeId): string {
  if (id === 'gland' || id === 'queens' || id === 'drones') {
    return OTHER_LABELS[id];
  }
  return isGenomeNodeId(id) ? GENOME_NODE_LABELS[id] : UNIQUE_ADAPTATION_LABELS[id];
}

function effectValue(
  target: UpgradeTarget,
  value: number | boolean,
  params: BalanceParams,
): string {
  if (typeof value === 'boolean' || target === 'fallenRecycling') {
    return value ? T.yes : T.no;
  }
  const format = VALUE_FORMATS[target];
  if (format === 'percent') {
    const scale =
      target === 'collectRate'
        ? params.droneCollectRate > 0
          ? PERCENT / params.droneCollectRate
          : 0
        : PERCENT;
    return `${formatNum(value * scale)} %`;
  }
  return format === 'rate' ? formatRate(value) : formatNum(value);
}

function effectText(effect: UpgradeEffect, params: BalanceParams): string {
  const { target } = effect;
  const before = effectValue(target, effect.before, params);
  const after = effectValue(target, effect.after, params);
  return `${TARGET_LABELS[target]}: ${before} → ${after}`;
}

/** Zeilen der Upgrade-Tabelle als Texte; Zahlen über die Formatierung aus `shared/util`. */
export function upgradeRowViews(
  rows: readonly UpgradeRow[],
  params: BalanceParams,
): UpgradeRowView[] {
  return rows.map((row) => ({
    id: row.id,
    label: upgradeLabel(row.id),
    kind: KIND_LABELS[row.kind],
    status:
      row.kind === 'node' || row.kind === 'unique' ? (row.owned ? T.owned : T.open) : NO_VALUE,
    cost: `${formatNum(row.cost)} ${CURRENCY_LABELS[row.currency]}`,
    effects: row.effects.map((effect) => effectText(effect, params)),
    foodGain: row.foodGainPerSecond === 0 ? NO_VALUE : formatRate(row.foodGainPerSecond),
    foodGainShare:
      row.foodGainShare === null || row.foodGainPerSecond === 0
        ? NO_VALUE
        : formatShare(row.foodGainShare),
    payback: row.paybackMs === null ? NO_VALUE : formatElapsed(row.paybackMs),
  }));
}
