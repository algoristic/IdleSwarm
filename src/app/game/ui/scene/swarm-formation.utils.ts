import { UNIT_IDS } from '../../domain/models/unit.model';
import { amoebaCrawl, amoebaPhaseOffset } from '../art/unit-sprite/amoeba.utils';
import { parameciumPhaseOffset, parameciumSwim } from '../art/unit-sprite/paramecium.utils';
import { SwarmFigure } from './models/swarm.model';

const GOLDEN_ANGLE = 2.39996;
const BOB_SCALES = [0, 1, 1, 1, 0.9, 0.8];
const EATER_SCALE = 1.4;
const EATER_SPACING = { site: 22, travel: 18 } as const;
const SWIM = { ring: 66, speed: 11 } as const;
const BROODER_CRAWL = { reach: 6, step: 4 } as const;

export function swarmFigureCounts(units: readonly number[]): number[] {
  const eaters = units[0];
  const brooders = units[1];
  return [
    eaters < 1
      ? 0
      : eaters <= 12
        ? Math.floor(eaters)
        : Math.min(48, Math.round(12 + 6 * Math.log2(eaters / 12))),
    brooders >= 1 ? Math.min(8, 1 + Math.floor(2 * Math.log10(brooders))) : 0,
    ...[2, 3, 4, 5].map((k) =>
      units[k] >= 1 ? Math.min(4, 1 + Math.floor(Math.log10(units[k]))) : 0,
    ),
  ];
}

export function swarmFigures(units: readonly number[], travelling: boolean): SwarmFigure[] {
  const counts = swarmFigureCounts(units);
  const fx = travelling ? 1.25 : 1;
  const fy = travelling ? 0.62 : 1;
  const figures: SwarmFigure[] = [];
  let slot = 0;
  for (let k = 5; k >= 1; k--) {
    for (let i = 0; i < counts[k]; i++, slot++) {
      const a = slot * GOLDEN_ANGLE;
      const r = 18 + 22 * Math.sqrt(slot);
      const x = Math.cos(a) * r * fx;
      const y = Math.sin(a) * r * fy;
      if (k === 1 && !travelling) {
        figures.push({
          kind: 'crawl',
          unit: 'brooder',
          x,
          y,
          scale: BOB_SCALES[k],
          index: i,
          crawl: amoebaCrawl(i, {
            start: [x, y],
            inner: Math.max(0, r - BROODER_CRAWL.reach),
            outer: r + BROODER_CRAWL.reach,
            step: BROODER_CRAWL.step,
          }),
          offset: amoebaPhaseOffset(i),
        });
        continue;
      }
      figures.push({
        kind: 'bob',
        unit: UNIT_IDS[k],
        x,
        y,
        rotation: travelling ? 0 : Math.round(a * 57),
        scale: BOB_SCALES[k],
        variant: 1 + (slot % 3),
        delay: (slot * 0.7) % 5,
      });
    }
  }
  const r0 = 30 + 22 * Math.sqrt(slot);
  const spacing = travelling ? EATER_SPACING.travel : EATER_SPACING.site;
  const outer = Math.max(r0 + spacing * Math.sqrt(counts[0] + 1) + 10, r0 + SWIM.ring);
  for (let i = 0; i < counts[0]; i++) {
    const a = i * GOLDEN_ANGLE;
    const r = r0 + spacing * Math.sqrt(i + 1);
    const x = Math.cos(a) * r * fx;
    const y = Math.sin(a) * r * fy;
    const scale = +((0.95 + ((i * 37) % 25) / 100) * EATER_SCALE).toFixed(3);
    if (!travelling) {
      figures.push({
        kind: 'glide',
        unit: 'eater',
        x,
        y,
        scale,
        index: i,
        swim: parameciumSwim(i, { start: [x, y], inner: r0, outer, speed: SWIM.speed }),
        offset: parameciumPhaseOffset(i),
      });
    } else {
      figures.push({
        kind: 'swim',
        unit: 'eater',
        x,
        y,
        rotation: Math.round(((i * 37) % 21) - 10),
        scale,
        variant: 1 + (i % 3),
        delay: +((i * 1.3) % 5).toFixed(1),
        rollDelay: +((i * 0.37) % 1).toFixed(2),
      });
    }
  }
  return figures;
}
