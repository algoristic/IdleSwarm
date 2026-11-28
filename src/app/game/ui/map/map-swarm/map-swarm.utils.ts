import { formatCoord, formatPoint, Point } from '../../art/path.utils';
import {
  amoebaCrawl,
  amoebaPhaseOffset,
  amoebaVariantFor,
} from '../../art/unit-sprite/amoeba.utils';
import { smilBegin } from '../../art/unit-sprite/figure.utils';
import {
  PARAMECIUM_TIMING,
  parameciumPhaseOffset,
  parameciumSwim,
  parameciumVariantFor,
} from '../../art/unit-sprite/paramecium.utils';
import { MapSwarmCounts, MapSwarmCrawler, MapSwarmGlider, MapSwarmLayout } from './map-swarm.model';

const MAX_EATERS = 14;
const MAX_BROODERS = 3;
const SWIM = { inner: 15, ring: 24, speed: 5.5 } as const;
const BROODER_CRAWL = { outer: 10, step: 3 } as const;

function mapSwarmCounts(eaters: number, brooders: number): MapSwarmCounts {
  return {
    eaters: Math.min(
      MAX_EATERS,
      Math.floor(eaters),
      Math.max(eaters >= 1 ? 3 : 0, Math.ceil(2.2 * Math.log2(eaters + 1))),
    ),
    brooders: brooders >= 1 ? Math.min(MAX_BROODERS, 1 + Math.floor(Math.log10(brooders))) : 0,
  };
}

function placed([x, y]: Point): string {
  return `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
}

export function mapSwarmLayout(eaters: number, brooders: number): MapSwarmLayout {
  const counts = mapSwarmCounts(eaters, brooders);
  const brooderFigures: MapSwarmCrawler[] = [];
  for (let i = 0; i < counts.brooders; i++) {
    const angle = i * 2.4;
    brooderFigures.push(crawlerFigure([Math.cos(angle) * 7, Math.sin(angle) * 7], i));
  }
  const eaterFigures: MapSwarmGlider[] = [];
  const outer = Math.max(6 + 4.6 * Math.sqrt(counts.eaters + 1) + 4, SWIM.inner + SWIM.ring);
  for (let i = 0; i < counts.eaters; i++) {
    const angle = i * 2.39996;
    const radius = 6 + 4.6 * Math.sqrt(i + 1);
    eaterFigures.push(gliderFigure([Math.cos(angle) * radius, Math.sin(angle) * radius], i, outer));
  }
  return { brooders: brooderFigures, eaters: eaterFigures };
}

function crawlerFigure(start: Point, i: number): MapSwarmCrawler {
  const crawl = amoebaCrawl(i, {
    start,
    inner: 0,
    outer: BROODER_CRAWL.outer,
    step: BROODER_CRAWL.step,
  });
  const phase = amoebaPhaseOffset(i);
  const duration = `${crawl.duration}s`;
  const begin = smilBegin(phase, crawl.duration);
  return {
    transform: placed(start),
    crawl,
    duration,
    begin,
    phase,
    light: {
      start: `translate(${crawl.lightValues.split(';')[0]})`,
      values: crawl.lightValues,
      keyTimes: crawl.keyTimes,
      keySplines: crawl.keySplines,
      calcMode: 'spline',
      duration,
      begin,
    },
    startTranslate: `translate(${formatPoint([crawl.x.values[0], crawl.y.values[0]])})`,
    startRotate: `rotate(${formatCoord(crawl.rotation.values[0])})`,
    variant: amoebaVariantFor(i),
  };
}

function gliderFigure(start: Point, i: number, outer: number): MapSwarmGlider {
  const swim = parameciumSwim(i, { start, inner: SWIM.inner, outer, speed: SWIM.speed });
  const phase = parameciumPhaseOffset(i);
  const duration = `${swim.duration}s`;
  const begin = smilBegin(phase, swim.duration);
  return {
    transform: placed(start),
    path: swim.path,
    keyPoints: swim.keyPoints,
    keyTimes: swim.keyTimes,
    duration,
    begin,
    wobbleBegin: smilBegin(phase, PARAMECIUM_TIMING.roll),
    phase,
    light: {
      start: `translate(${swim.lightValues.split(';')[0]})`,
      values: swim.lightValues,
      keyTimes: swim.keyTimes,
      keySplines: null,
      calcMode: 'linear',
      duration,
      begin,
    },
    startRotate: `rotate(${formatCoord(swim.rotation.values[0])})`,
    variant: parameciumVariantFor(i),
  };
}
