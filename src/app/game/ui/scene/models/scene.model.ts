import { SiteTypeId } from '../../../domain/models/site.model';
import { SceneMood, SiteColors, ZoneMood } from '../../art/art-palette';

export interface SvgCircle {
  cx: string;
  cy: string;
  r: string;
}

export interface MoodShapes {
  paths: string[];
  circles: SvgCircle[];
}

export interface FarMoodScene {
  colors: Readonly<ZoneMood>;
  rays: string[];
  shapes: MoodShapes;
  specks: SvgCircle[];
}

export interface ZoneHazeScene {
  color: string;
  blobs: string[];
  specks: SvgCircle[];
}

export type SceneBackdropKind = SiteTypeId | 'travel' | 'none';

export interface SceneBackdrop {
  colors: Readonly<SceneMood>;
  rayOpacity: number;
  rays: string[];
  specks: SvgCircle[];
}

export interface SiteDot extends SvgCircle {
  fill: string;
}

export interface SiteBlade {
  d: string;
  fill: string;
}

export interface SceneSite {
  colors: Readonly<SiteColors>;
  basePaths: string[];
  midPaths: string[];
  topPaths: string[];
  dots: SiteDot[];
  legs: boolean;
  blades: SiteBlade[];
}

export interface DriftSpeck {
  x: number;
  y: number;
  r: number;
  c: string;
}

export interface DriftStreak {
  x: number;
  y: number;
  len: number;
  c: string;
  w: number;
  o: number;
}
