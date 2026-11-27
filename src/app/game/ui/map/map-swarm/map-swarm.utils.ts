import { lcg } from '../../art/shape.utils';
import {
  MapSwarmBrooder,
  MapSwarmCounts,
  MapSwarmLayout,
  MapSwarmPaddler,
  PaddlerParams,
} from './map-swarm.model';

const MAX_EATERS = 14;
const MAX_BROODERS = 3;
const EATER_SCALE = 0.55;
const PADDLE_RADIUS_MIN = 2.5;
const PADDLE_RADIUS_RANGE = 3;

export function mapSwarmCounts(eaters: number, brooders: number): MapSwarmCounts {
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
  const eaterFigures: MapSwarmPaddler[] = [];
  for (let i = 0; i < counts.eaters; i++) {
    const angle = i * 2.39996;
    const radius = 6 + 4.6 * Math.sqrt(i + 1);
    eaterFigures.push(
      paddlerFigure(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        EATER_SCALE,
        i,
        PADDLE_RADIUS_MIN,
        PADDLE_RADIUS_RANGE,
      ),
    );
  }
  return { brooders: brooderFigures, eaters: eaterFigures };
}

export function paddlerParams(i: number, rMin: number, rVar: number): PaddlerParams {
  const random = lcg(i * 7919 + 13);
  const rr = rMin + random() * rVar;
  const dur = 8 + random() * 8;
  const rev = random() < 0.4;
  const start = random() * 360;
  const roll = 0.8 + random() * 0.6;
  return { rr, dur, rev, start, roll, padDelay: random() * dur, rollDelay: random() };
}

export function paddlerFigure(
  x: number,
  y: number,
  scale: number,
  i: number,
  rMin: number,
  rVar: number,
): MapSwarmPaddler {
  const p = paddlerParams(i, rMin, rVar);
  return {
    transform: `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(p.start)})`,
    reverse: p.rev,
    paddleDuration: `${p.dur.toFixed(1)}s`,
    paddleDelay: `-${p.padDelay.toFixed(1)}s`,
    spriteTransform: `translate(${p.rr.toFixed(1)} 0) rotate(${p.rev ? -90 : 90}) scale(${scale})`,
    rollDuration: `${p.roll.toFixed(1)}s`,
    rollDelay: `-${p.rollDelay.toFixed(1)}s`,
  };
}
