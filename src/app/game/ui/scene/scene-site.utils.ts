import { SiteTypeId } from '../../domain/models/site.model';
import { SCENE_COLORS, SITE_COLORS } from '../art/art-palette';
import { blobPath, lcg } from '../art/shape.utils';
import { SceneSite, SiteBlade, SiteDot } from './models/scene.model';

type Blob = [x: number, y: number, r: number];

export const CARCASS_LEGS_PATH =
  'M-120 60l-90 90M-60 110l-30 120M60 110l40 120M120 60l90 90M-120-60l-90-90M120-60l90-90';

export function sceneSiteScale(fraction: number): string {
  return (0.35 + 0.65 * Math.sqrt(Math.max(0, fraction))).toFixed(4);
}

export function sceneSite(type: SiteTypeId, shape: number): SceneSite {
  const colors = SITE_COLORS[type];
  const random = lcg(shape);
  const blobs: Blob[] = [[0, 0, 190]];
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05 + random();
    const r = 240 + random() * 90;
    blobs.push([Math.cos(a) * r, Math.sin(a) * r, 70 + random() * 50]);
  }
  const basePaths = blobs.map(([x, y, r], i) => blobPath(r, shape + i * 31, 10, 0.22, x, y));
  const midPaths = blobs.map(([x, y, r], i) => blobPath(r * 0.72, shape + i * 53, 9, 0.25, x, y));
  const topPaths = blobs.map(([x, y, r], i) =>
    blobPath(r * 0.38, shape + i * 71, 8, 0.3, x + r * 0.15, y - r * 0.1),
  );
  const dots: SiteDot[] = [];
  for (let i = 0; i < 160; i++) {
    const [bx, by, br] = blobs[Math.floor(random() * blobs.length)];
    const a = random() * 6.28;
    const rr = Math.sqrt(random()) * br * 0.9;
    const cx = (bx + Math.cos(a) * rr).toFixed(1);
    const cy = (by + Math.sin(a) * rr).toFixed(1);
    const r = (1 + random() * 1.8).toFixed(1);
    dots.push({ cx, cy, r, fill: colors.dot[i % 3 === 0 ? 1 : 0] });
  }
  const blades: SiteBlade[] = [];
  if (type === 'seagrass') {
    for (let i = 0; i < 14; i++) {
      const x = -260 + i * 40 + random() * 20;
      const height = 200 + random() * 200;
      // ohne toFixed wie im Prototyp
      const d =
        `M${x} 300Q${x + (random() - 0.5) * 160} ${300 - height * 0.6} ` +
        `${x + (random() - 0.5) * 200} ${300 - height}Q${x + 20} ${300 - height * 0.4} ${x + 22} 300Z`;
      const fill = i % 2 ? SCENE_COLORS.seagrassBladeOdd : SCENE_COLORS.seagrassBladeEven;
      blades.push({ d, fill });
    }
  }
  return { colors, basePaths, midPaths, topPaths, dots, legs: type === 'carcass', blades };
}
