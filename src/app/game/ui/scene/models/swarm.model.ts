import { UnitId } from '../../../domain/models/unit.model';
import { PaddlerParams } from '../../art/paddler.utils';

interface BobFigure {
  kind: 'bob';
  unit: UnitId;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  variant: number;
  delay: number;
}

interface PaddleFigure extends PaddlerParams {
  kind: 'paddle';
  unit: 'eater';
  x: number;
  y: number;
  scale: number;
  index: number;
}

interface SwimFigure {
  kind: 'swim';
  unit: 'eater';
  x: number;
  y: number;
  rotation: number;
  scale: number;
  variant: number;
  delay: number;
  rollDelay: number;
}

export type SwarmFigure = BobFigure | PaddleFigure | SwimFigure;

export interface TrekTransition {
  from: number;
  to: number;
  at: number;
}

export interface DriftCircle {
  x: number;
  y: number;
  r: number;
}

export interface SpeckGroup {
  color: string;
  circles: readonly DriftCircle[];
}

export interface StreakSegment {
  y0: number;
  y1: number;
}

export interface StreakLine {
  color: string;
  width: number;
  opacity: number;
  x: number;
  segments: readonly StreakSegment[];
}

interface SpeckPath {
  color: string;
  path: Path2D;
}

interface StreakPath {
  color: string;
  width: number;
  opacity: number;
  path: Path2D;
}

export type SwarmDrift =
  { travel: false; groups: readonly SpeckPath[] } | { travel: true; groups: readonly StreakPath[] };

export interface SwarmSprite {
  image: CanvasImageSource;
  halfExtent: number;
}

export interface SwarmFrame {
  now: number;
  motion: boolean;
  pixelRatio: number;
  drift: SwarmDrift | null;
  flowRotation: number;
  trek: TrekTransition;
  swirl: boolean;
  figures: readonly SwarmFigure[];
  sprites: Readonly<Partial<Record<UnitId, SwarmSprite>>>;
}
