import { UNIT_SPRITE_COLORS } from '../art-palette';
import { keyframeValue } from '../keyframes.utils';
import { Point, smoothSegments } from '../path.utils';
import {
  AMOEBA_FLOW,
  AMOEBA_SCALE,
  AMOEBA_STROKE,
  AMOEBA_TIMING,
  AMOEBA_VARIANTS,
} from './amoeba.utils';
import { DEGREES, VACUOLE_PULSE, worldLight } from './figure.utils';
import { SpriteDetail } from './unit-sprite.model';

const TAU = Math.PI * 2;
const COLORS = UNIT_SPRITE_COLORS.brooder;

function trace(ctx: CanvasRenderingContext2D, points: readonly Point[]): void {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [, c1, c2, p] of smoothSegments(points)) {
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p[0], p[1]);
  }
  ctx.closePath();
}

function circle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

export function drawAmoeba(
  ctx: CanvasRenderingContext2D,
  variantIndex: number,
  time: number,
  offset: number,
  detail: SpriteDetail,
): void {
  const variant = AMOEBA_VARIANTS[variantIndex % AMOEBA_VARIANTS.length];
  const t = time + offset;
  const cycle = t / AMOEBA_TIMING.outline;
  const phase = (cycle % 1) * TAU;
  const matrix = ctx.getTransform();
  const [lightX, lightY] = worldLight(Math.atan2(matrix.b, matrix.a) * DEGREES);
  const body = variant.outline(phase);
  const full = detail === 'full';
  ctx.save();
  ctx.scale(AMOEBA_SCALE, AMOEBA_SCALE);
  ctx.lineJoin = 'round';
  if (full) {
    trace(ctx, body);
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = ctx.strokeStyle = COLORS.glow;
    ctx.lineWidth = AMOEBA_STROKE.glow;
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  trace(ctx, body);
  ctx.fillStyle = ctx.strokeStyle = COLORS.rim;
  ctx.lineWidth = AMOEBA_STROKE.rim;
  ctx.fill();
  ctx.stroke();
  ctx.clip();
  ctx.fillStyle = COLORS.shade;
  ctx.fill();
  ctx.translate(lightX, lightY);
  ctx.fillStyle = COLORS.body;
  trace(ctx, body);
  ctx.fill();
  ctx.translate(-lightX, -lightY);
  ctx.fillStyle = COLORS.inner;
  trace(ctx, variant.inner(phase));
  ctx.fill();
  const flow = keyframeValue(AMOEBA_FLOW, cycle);
  ctx.translate(flow, 0);
  const wanderAt = t / AMOEBA_TIMING.nucleus;
  ctx.fillStyle = COLORS.nucleus;
  circle(
    ctx,
    variant.nucleus[0] + keyframeValue(variant.nucleusX, wanderAt),
    variant.nucleus[1] + keyframeValue(variant.nucleusY, wanderAt),
    1.9,
  );
  for (const egg of variant.eggs) {
    ctx.fillStyle = COLORS.egg;
    circle(ctx, egg.at[0], egg.at[1], egg.r);
    if (full) {
      ctx.fillStyle = COLORS.eggHighlight;
      circle(ctx, egg.at[0] + egg.highlight[0], egg.at[1] + egg.highlight[1], egg.r * 0.32);
    }
  }
  ctx.translate(-flow, 0);
  if (full) {
    const pulse = keyframeValue(VACUOLE_PULSE, t / AMOEBA_TIMING.vacuole);
    ctx.fillStyle = COLORS.vacuole;
    circle(ctx, variant.vacuole[0], variant.vacuole[1], 0.9 * pulse);
  }
  ctx.restore();
}
