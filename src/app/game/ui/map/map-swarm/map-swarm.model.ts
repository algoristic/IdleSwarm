import { EaterCrawl } from '../../art/unit-sprite/eater.utils';

export interface MapSwarmCounts {
  eaters: number;
  brooders: number;
}

export interface MapSwarmBrooder {
  transform: string;
}

export interface MapSwarmCrawler {
  transform: string;
  crawl: EaterCrawl;
  duration: string;
  begin: string;
  startTranslate: string;
  startRotate: string;
  variant: number;
}

export interface MapSwarmLayout {
  brooders: MapSwarmBrooder[];
  eaters: MapSwarmCrawler[];
}
