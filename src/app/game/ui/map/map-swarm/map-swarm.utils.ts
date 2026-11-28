import { formatCoord, formatPoint } from '../../art/path.utils';
import { eaterCrawl, eaterPhaseOffset, eaterVariantFor } from '../../art/unit-sprite/eater.utils';
import {
  MapSwarmBrooder,
  MapSwarmCounts,
  MapSwarmLayout,
  MapSwarmCrawler,
} from './map-swarm.model';

const MAX_EATERS = 14;
const MAX_BROODERS = 3;
const CRAWL_INNER = 15;
const CRAWL_STEP = 8;

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

export function mapSwarmLayout(eaters: number, brooders: number): MapSwarmLayout {
  const counts = mapSwarmCounts(eaters, brooders);
  const brooderFigures: MapSwarmBrooder[] = [];
  for (let i = 0; i < counts.brooders; i++) {
    const angle = i * 2.4;
    brooderFigures.push({
      transform: `translate(${(Math.cos(angle) * 7).toFixed(1)} ${(Math.sin(angle) * 7).toFixed(1)}) rotate(${i * 130}) scale(.42)`,
    });
  }
  const eaterFigures: MapSwarmCrawler[] = [];
  const outer = Math.max(6 + 4.6 * Math.sqrt(counts.eaters + 1) + 4, CRAWL_INNER + 3 * CRAWL_STEP);
  for (let i = 0; i < counts.eaters; i++) {
    const angle = i * 2.39996;
    const radius = 6 + 4.6 * Math.sqrt(i + 1);
    eaterFigures.push(crawlerFigure(Math.cos(angle) * radius, Math.sin(angle) * radius, i, outer));
  }
  return { brooders: brooderFigures, eaters: eaterFigures };
}

function crawlerFigure(x: number, y: number, i: number, outer: number): MapSwarmCrawler {
  const crawl = eaterCrawl(i, { start: [x, y], inner: CRAWL_INNER, outer, step: CRAWL_STEP });
  return {
    transform: `translate(${x.toFixed(1)} ${y.toFixed(1)})`,
    crawl,
    duration: `${crawl.duration}s`,
    begin: `-${eaterPhaseOffset(i).toFixed(2)}s`,
    startTranslate: `translate(${formatPoint([crawl.x.values[0], crawl.y.values[0]])})`,
    startRotate: `rotate(${formatCoord(crawl.rotation.values[0])})`,
    variant: eaterVariantFor(i),
  };
}
