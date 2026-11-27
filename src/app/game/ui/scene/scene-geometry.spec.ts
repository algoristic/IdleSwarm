import { ZONE_MOODS } from '../art/art-palette';
import { lcg } from '../art/shape.utils';
import { driftItems } from './drift.utils';
import { MoodShapes, SceneBackdropKind, SvgCircle } from './models/scene.model';
import { farMoodIndex, farMoodScene, moodShapes, sceneBackdrop, zoneHazeScene } from './mood.utils';
import { SCENE_GEOMETRY_FIXTURE as FIXTURE } from './scene-geometry.fixture';
import { CARCASS_LEGS_PATH, sceneSite, sceneSiteScale } from './scene-site.utils';

function fnv(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash;
}

function digest(markup: string): { length: number; hash: number; start: string } {
  return { length: markup.length, hash: fnv(markup), start: markup.slice(0, 160) };
}

function circle(c: SvgCircle, extra = ''): string {
  return `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}"${extra}/>`;
}

function paths(list: readonly string[]): string {
  return list.map((d) => `<path d="${d}"/>`).join('');
}

function rays(id: string, list: readonly string[]): string {
  return list.map((d) => `<path d="${d}" fill="url(#${id}Ray)"/>`).join('');
}

function specks(fill: string, list: readonly SvgCircle[], style = ''): string {
  return `<g class="drift"${style}><g fill="${fill}">${list.map((c) => circle(c)).join('')}</g></g>`;
}

function shapesMarkup(fill: string, shapes: MoodShapes): string {
  const circles = shapes.circles.map((c) => circle(c, ' opacity=".6"')).join('');
  return `<g fill="${fill}">${paths(shapes.paths)}${circles}</g>`;
}

const rect = (id: string): string =>
  `<rect x="-1000" y="-1000" width="2000" height="2000" fill="url(#${id})"/>`;

describe('scene geometry', () => {
  it('picks the mood of the next zone and the last one behind the last zone', () => {
    expect([0, 1, 2, 3].map((zone) => farMoodIndex(zone, 4))).toEqual([1, 2, 3, 4]);
    expect(farMoodIndex(3, 5)).toBe(4);
    expect(farMoodIndex(0, 1)).toBe(4);
  });

  it('draws the far mood like the prototype', () => {
    for (const { zone, zoneCount, ...expected } of FIXTURE.far) {
      const scene = farMoodScene(farMoodIndex(zone, zoneCount));
      const markup =
        rect('farG') +
        rays('farG', scene.rays) +
        shapesMarkup(scene.colors.shape, scene.shapes) +
        specks(scene.colors.light, scene.specks);
      expect(digest(markup)).toEqual(expected);
    }
  });

  it('draws the haze of the current zone like the prototype', () => {
    for (const { zone, ...expected } of FIXTURE.haze) {
      const scene = zoneHazeScene(zone);
      const markup =
        `<g fill="${scene.color}" opacity=".35">${paths(scene.blobs)}</g>` +
        specks('#8ea6dc', scene.specks, ' style="animation-duration:26s"');
      expect(digest(markup)).toEqual(expected);
    }
  });

  it('draws the backdrop of sites and travel like the prototype', () => {
    for (const { kind, zone, ...expected } of FIXTURE.backdrop) {
      const scene = sceneBackdrop(kind as SceneBackdropKind, zone);
      const markup =
        rect('mbG') +
        rays('mbG', scene.rays) +
        specks(scene.colors.light, scene.specks, ' style="animation-duration:24s"') +
        '</g>';
      expect(digest(markup)).toEqual(expected);
    }
  });

  it('draws every site type like the prototype', () => {
    for (const { type, shape, ...expected } of FIXTURE.site) {
      const site = sceneSite(type, shape);
      const c = site.colors;
      let markup =
        `<g fill="${c.shade}" transform="translate(6 8)">${paths(site.basePaths)}</g>` +
        `<g fill="${c.base}">${paths(site.basePaths)}</g>` +
        `<g fill="${c.mid}">${paths(site.midPaths)}</g>` +
        `<g fill="${c.top}">${paths(site.topPaths)}</g>` +
        `<g>${site.dots.map((dot) => circle(dot, ` fill="${dot.fill}"`)).join('')}</g>`;
      if (site.legs) {
        markup +=
          '<g stroke="#ff6a3d" stroke-width="16" stroke-linecap="round" fill="none" opacity=".9">' +
          `<path d="${CARCASS_LEGS_PATH}"/></g>`;
      }
      for (const blade of site.blades) {
        markup += `<path d="${blade.d}" fill="${blade.fill}" opacity=".85"/>`;
      }
      expect(digest(markup)).toEqual(expected);
    }
  });

  it('draws rocks and grass like the prototype', () => {
    const rocks = ZONE_MOODS[1];
    const grass = ZONE_MOODS[3];
    expect(shapesMarkup(rocks.shape, moodShapes(rocks, lcg(99)))).toBe(FIXTURE.shapes.rocks);
    expect(shapesMarkup(grass.shape, moodShapes(grass, lcg(99)))).toBe(FIXTURE.shapes.grass);
  });

  it('lays out the drift like the prototype', () => {
    expect(driftItems(false).slice(0, 3)).toEqual(FIXTURE.driftSpecks);
    expect(driftItems(true).slice(0, 3)).toEqual(
      FIXTURE.driftStreaks.map((streak) => ({ ...streak, o: Number(streak.o) })),
    );
    expect(driftItems(false)).toHaveLength(70);
    expect(driftItems(true)).toHaveLength(16);
  });

  it('scales the site with the root of its fill', () => {
    for (const { fraction, scale } of FIXTURE.scale) {
      expect(sceneSiteScale(fraction)).toBe(scale);
    }
  });
});
