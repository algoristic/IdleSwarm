import type {
  UnlockEffectTarget,
  ValueEffectTarget,
} from '@app/balance/domain/models/effect.model';
import type { SiteTypeId } from '@app/site/domain/data/sites-era1.data';

import type {
  GenomeBranch,
  GenomeNodeId,
  GenomeRoot,
  UniqueAdaptationId,
} from '../../domain/models/genome.model';

/** Alles, was im Baum steht und auswählbar ist: Wurzel, reguläre Knoten, einzigartige Adaptionen. */
export type GenomeEntryId = GenomeRoot | GenomeNodeId | UniqueAdaptationId;

/** Farbe eines Eintrags: Ast des regulären Knotens, `unique` für Wurzel und einzigartige. */
export type GenomeTone = GenomeBranch | 'unique';

/**
 * Wie ein Wert angezeigt wird: `rate` mit einer Nachkommastelle, `count` ganzzahlig, `percent`
 * als ganze Prozent (der Wert ist dann schon mit 100 multipliziert).
 */
export const EFFECT_FORMATS = ['rate', 'count', 'percent'] as const;

export type EffectFormat = (typeof EFFECT_FORMATS)[number];

/** „Effekt vorher → nachher“ eines regulären Knotens (US-05.02), in Anzeigeeinheiten. */
export type EffectPreviewView =
  | {
      readonly kind: 'value';
      readonly target: ValueEffectTarget;
      readonly format: EffectFormat;
      readonly before: number;
      readonly after: number;
    }
  | {
      readonly kind: 'unlock';
      readonly target: UnlockEffectTarget;
      readonly before: boolean;
      readonly after: boolean;
    };

/**
 * Effekt einer einzigartigen Adaption als Betrag (US-06.02), z. B. „+25 %“; `siteType` nennt die
 * Bedingung („an Schloten“), `null` gilt überall.
 */
export type UniqueEffectView =
  | {
      readonly kind: 'value';
      readonly target: ValueEffectTarget;
      readonly format: EffectFormat;
      readonly delta: number;
      /** `+` vor positiven Beträgen; negative bringen ihr Minus aus der Formatierung mit. */
      readonly sign: '+' | '';
      readonly siteType: SiteTypeId | null;
    }
  | {
      readonly kind: 'unlock';
      readonly target: UnlockEffectTarget;
      readonly siteType: SiteTypeId | null;
    };
