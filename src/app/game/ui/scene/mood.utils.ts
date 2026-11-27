import { SiteTypeId } from '../../domain/models/site.model';
import { SCENE_COLORS, SceneMood, SITE_MOODS, ZONE_MOODS, ZoneMood } from '../art/art-palette';
import { blobPath, lcg, RandomSource } from '../art/shape.utils';
import {
  FarMoodScene,
  MoodShapes,
  SceneBackdrop,
  SceneBackdropKind,
  SvgCircle,
  ZoneHazeScene,
} from './models/scene.model';

// Der Prototyp mischt die Länge seiner deutschen Schlüssel (algen, plankton, krebs, schnee, seegras) in den Seed
const PROTOTYPE_SITE_KEY_LENGTHS: Readonly<Record<SiteTypeId, number>> = {
  algae: 5,
  plankton: 8,
  carcass: 5,
  marineSnow: 6,
  seagrass: 7,
};

const LAST_MOOD = ZONE_MOODS.length - 1;

const CLIFF_PATHS = [
  'M-1000-200C-820-260-760-60-700 120S-640 620-540 1000H-1000Z',
  'M1000-320C820-240 790-20 720 180S660 700 600 1000H1000Z',
];
const ABYSS_PATH = 'M-1000 700Q-500 560 0 660T1000 620V1000H-1000Z';

export function farMoodIndex(zone: number, zoneCount: number): number {
  const next = Math.min(zone + 1, LAST_MOOD);
  return zone + 1 < zoneCount ? next : LAST_MOOD;
}

export function moodRays(
  random: RandomSource,
  count: number,
  spread: number,
  length: number,
): string[] {
  const rays: string[] = [];
  for (let i = 0; i < count; i++) {
    const x = (random() - 0.5) * spread;
    const w = 30 + random() * 70;
    // Animationsverzögerung im Prototyp; der Aufruf hält die Zufallsfolge gleich
    random();
    const right = (x + w + random() * 120).toFixed(0);
    const left = (x - w - random() * 120).toFixed(0);
    rays.push(
      `M${(x - w * 0.3).toFixed(0)} -1000L${(x + w * 0.3).toFixed(0)} -1000L${right} ${length}L${left} ${length}Z`,
    );
  }
  return rays;
}

export function moodShapes(mood: Readonly<ZoneMood>, random: RandomSource): MoodShapes {
  const paths: string[] = [];
  const circles: SvgCircle[] = [];
  if (mood.kind === 'rocks' || mood.kind === 'cliffs') {
    const rocks = mood.kind === 'rocks';
    const count = rocks ? 7 : 5;
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 1700;
      const y = 380 + random() * 500;
      const r = (rocks ? 110 : 220) + random() * 160;
      paths.push(blobPath(r, 300 + i * 17, 8, 0.3, x, y));
    }
    if (!rocks) paths.push(...CLIFF_PATHS);
  } else if (mood.kind === 'grass') {
    for (let i = 0; i < 26; i++) {
      const x = -1000 + i * 80 + random() * 40;
      const height = 380 + random() * 520;
      const bend = (random() - 0.5) * 260;
      paths.push(
        `M${(x - 16).toFixed(0)} 1000Q${(x + bend).toFixed(0)} ${(1000 - height * 0.6).toFixed(0)} ` +
          `${(x + bend * 1.3).toFixed(0)} ${(1000 - height).toFixed(0)}Q${(x + bend * 0.5 + 14).toFixed(0)} ` +
          `${(1000 - height * 0.5).toFixed(0)} ${(x + 16).toFixed(0)} 1000Z`,
      );
    }
  } else if (mood.kind === 'abyss') {
    paths.push(ABYSS_PATH);
  } else {
    for (let i = 0; i < 5; i++) {
      const cx = ((random() - 0.5) * 1600).toFixed(0);
      const cy = ((random() - 0.5) * 1600).toFixed(0);
      const r = (80 + random() * 160).toFixed(0);
      circles.push({ cx, cy, r });
    }
  }
  return { paths, circles };
}

export function moodSpecks(
  random: RandomSource,
  count: number,
  area: number,
  rMin: number,
  rMax: number,
): SvgCircle[] {
  const specks: SvgCircle[] = [];
  for (let i = 0; i < count; i++) {
    const cx = ((random() - 0.5) * area).toFixed(0);
    const cy = ((random() - 0.5) * area).toFixed(0);
    const r = (rMin + random() * (rMax - rMin)).toFixed(1);
    specks.push({ cx, cy, r });
  }
  return specks;
}

export function farMoodScene(mood: number): FarMoodScene {
  const colors = ZONE_MOODS[mood];
  const random = lcg(1000 + mood * 77);
  const rays = moodRays(random, 7, 1500, 700);
  const shapes = moodShapes(colors, random);
  const specks = moodSpecks(random, 40, 1800, 3, 8);
  return { colors, rays, shapes, specks };
}

export function zoneHazeScene(zone: number): ZoneHazeScene {
  const colors = ZONE_MOODS[Math.min(zone, LAST_MOOD)];
  const random = lcg(2000 + zone * 31);
  const blobs: string[] = [];
  for (let i = 0; i < 6; i++) {
    const r = 160 + random() * 200;
    const cx = (random() - 0.5) * 1700;
    const cy = (random() - 0.5) * 1700;
    blobs.push(blobPath(r, 500 + i * 13, 9, 0.35, cx, cy));
  }
  const specks = moodSpecks(random, 60, 1900, 1, 2.6);
  return { color: colors.light, blobs, specks };
}

export function sceneBackdrop(kind: SceneBackdropKind, zone: number): SceneBackdrop {
  const travel = kind === 'travel' || kind === 'none';
  const zoneMood = ZONE_MOODS[Math.min(zone, LAST_MOOD)];
  const colors: Readonly<SceneMood> =
    kind === 'travel' || kind === 'none'
      ? {
          light: zoneMood.mid,
          mid: zoneMood.deep,
          deep: SCENE_COLORS.travelDeep,
          glow: zoneMood.glow,
        }
      : SITE_MOODS[kind];
  const kindSeed = kind === 'travel' || kind === 'none' ? 1 : PROTOTYPE_SITE_KEY_LENGTHS[kind] * 7;
  const random = lcg(700 + zone * 13 + kindSeed);
  const rays = moodRays(random, travel ? 4 : 6, 900, 500);
  const specks = moodSpecks(random, 26, 1100, 6, 16);
  return { colors, rayOpacity: travel ? 0.1 : 0.16, rays, specks };
}
