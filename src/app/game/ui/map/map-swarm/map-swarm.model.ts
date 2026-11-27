export interface PaddlerParams {
  rr: number;
  dur: number;
  rev: boolean;
  start: number;
  roll: number;
  padDelay: number;
  rollDelay: number;
}

export interface MapSwarmCounts {
  eaters: number;
  brooders: number;
}

export interface MapSwarmBrooder {
  transform: string;
}

export interface MapSwarmPaddler {
  transform: string;
  reverse: boolean;
  paddleDuration: string;
  paddleDelay: string;
  spriteTransform: string;
  rollDuration: string;
  rollDelay: string;
}

export interface MapSwarmLayout {
  brooders: MapSwarmBrooder[];
  eaters: MapSwarmPaddler[];
}
