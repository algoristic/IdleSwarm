import { UNIT_IDS } from '../../domain/models/unit.model';
import { eaterCrawl, eaterPhaseOffset } from '../art/unit-sprite/eater.utils';
import { SwarmFigure } from './models/swarm.model';

const GOLDEN_ANGLE = 2.39996;
const BOB_SCALES = [0, 1, 1, 1, 0.9, 0.8];
const CRAWL_STEP = 16;

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
      figures.push({
        kind: 'bob',
        unit: UNIT_IDS[k],
        x: Math.cos(a) * r * fx,
        y: Math.sin(a) * r * fy,
        rotation: travelling ? 0 : Math.round(a * 57),
        scale: BOB_SCALES[k],
        variant: 1 + (slot % 3),
        delay: (slot * 0.7) % 5,
      });
    }
  }
  const r0 = 30 + 22 * Math.sqrt(slot);
  const outer = Math.max(r0 + 17 * Math.sqrt(counts[0] + 1) + 10, r0 + 3 * CRAWL_STEP);
  for (let i = 0; i < counts[0]; i++) {
    const a = i * GOLDEN_ANGLE;
    const r = r0 + 17 * Math.sqrt(i + 1);
    const x = Math.cos(a) * r * fx;
    const y = Math.sin(a) * r * fy;
    const scale = +(0.95 + ((i * 37) % 25) / 100).toFixed(2);
    if (!travelling) {
      figures.push({
        kind: 'crawl',
        unit: 'eater',
        x,
        y,
        scale,
        index: i,
        crawl: eaterCrawl(i, { start: [x, y], inner: r0, outer, step: CRAWL_STEP }),
        offset: eaterPhaseOffset(i),
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
