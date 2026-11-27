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
