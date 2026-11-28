import { AmoebaCrawl } from '../../art/unit-sprite/amoeba.utils';
import { SpriteLight } from '../../art/unit-sprite/figure.utils';

export interface MapSwarmCounts {
  eaters: number;
  brooders: number;
}

interface MapSwarmFigure {
  transform: string;
  duration: string;
  begin: string;
  phase: number;
  light: SpriteLight;
  startRotate: string;
  variant: number;
}

export interface MapSwarmCrawler extends MapSwarmFigure {
  crawl: AmoebaCrawl;
  startTranslate: string;
}

export interface MapSwarmGlider extends MapSwarmFigure {
  path: string;
  keyPoints: string;
  keyTimes: string;
  wobbleBegin: string;
}

export interface MapSwarmLayout {
  brooders: MapSwarmCrawler[];
  eaters: MapSwarmGlider[];
}
