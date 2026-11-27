export interface MapSiteIconDot {
  cx: string;
  cy: string;
  r: string;
}

export interface MapSiteIconBlade {
  d: string;
  odd: boolean;
}

export interface AlgaeIconGeometry {
  type: 'algae';
  path: string;
  shadowTransform: string;
}

export interface PlanktonIconGeometry {
  type: 'plankton';
  radius: number;
  innerRadius: number;
  dots: MapSiteIconDot[];
}

export interface CarcassIconGeometry {
  type: 'carcass';
  transform: string;
  bodyPath: string;
}

export interface MarineSnowIconGeometry {
  type: 'marineSnow';
  radius: number;
  flakes: MapSiteIconDot[];
}

export interface SeagrassIconGeometry {
  type: 'seagrass';
  groundCy: number;
  groundRx: number;
  groundRy: number;
  blades: MapSiteIconBlade[];
}

export type MapSiteIconGeometry =
  | AlgaeIconGeometry
  | PlanktonIconGeometry
  | CarcassIconGeometry
  | MarineSnowIconGeometry
  | SeagrassIconGeometry;
