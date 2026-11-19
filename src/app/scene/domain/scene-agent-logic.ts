import { nextRandom, seedToRngState } from '@app/shared/util/rng/rng';
import { MS_PER_SECOND } from '@app/shared/util/time/time-units';
import { UNIT_TYPES, type UnitType } from '@app/swarm/domain/models/units.model';

import type { AgentPose, SceneAgent, SceneAgents, UnitCounts } from './models/scene.model';

/*
 * Bewegungsmodell nach Mockup K2-K (`frame()`). Das Mockup rechnet je Frame bei 60 fps; hier sind
 * Bahnen reine Funktionen der Zeit, die Geschwindigkeiten deshalb je Millisekunde. Reine
 * Darstellung, keine Spielbalance.
 */
export const MOCKUP_FRAME_MS = MS_PER_SECOND / 60;

/** Seed des visuellen RNG; unabhängig vom Spielstand, damit die Szene den Spiel-RNG nie berührt. */
export const SCENE_SEED = 'idleswarm-scene';

/** Ellipse der Bahnen: Die Szene ist leicht von oben gesehen. */
export const ORBIT_Y_SCALE = 0.82;

/** Drohnen wenden innen am Rand der Futterstelle und außen an ihrem Heimatradius. */
export const DRONE_INNER_RADIUS = 85;
const DRONE_HOME_RADIUS = [130, 260] as const;
/** Hinweg zur Futterstelle (ohne Last) und Rückweg (mit Last), Szene-Pixel je ms. */
const DRONE_SPEED_IN = 0.9 / MOCKUP_FRAME_MS;
const DRONE_SPEED_OUT = 0.7 / MOCKUP_FRAME_MS;
const DRONE_ANGULAR_SPEED = [0.002 / MOCKUP_FRAME_MS, 0.006 / MOCKUP_FRAME_MS] as const;
const SOLDIER_RADIUS = [220, 290] as const;
const SOLDIER_ANGULAR_SPEED = [-0.004 / MOCKUP_FRAME_MS, -0.0015 / MOCKUP_FRAME_MS] as const;
const QUEEN_RADIUS = [170, 200] as const;
const QUEEN_ANGULAR_SPEED = 0.0012 / MOCKUP_FRAME_MS;

/** Dauer des Ein- und Ausblendens bei geänderter Einheitenzahl. */
export const AGENT_FADE_MS = 600;

const FULL_TURN = Math.PI * 2;

export function createSceneAgents(seed: string = SCENE_SEED): SceneAgents {
  return { agents: [], rngState: seedToRngState(seed), nextId: 0, pruneAtMs: null };
}

/**
 * Gleicht die Agenten an die Sprite-Zahlen an, ohne die übrigen neu zu würfeln: Neue Agenten
 * blenden ein, überzählige (die jüngsten) blenden aus und fallen nach `AGENT_FADE_MS` heraus.
 */
export function syncAgents(current: SceneAgents, sprites: UnitCounts, nowMs: number): SceneAgents {
  let rngState = current.rngState;
  let nextId = current.nextId;
  const random = (min: number, max: number): number => {
    const result = nextRandom(rngState);
    rngState = result.rngState;
    return min + result.value * (max - min);
  };
  const kept = current.agents.filter(
    (agent) => agent.leftAtMs === null || nowMs - agent.leftAtMs < AGENT_FADE_MS,
  );
  const next: SceneAgent[] = [];
  for (const kind of UNIT_TYPES) {
    const ofKind = kept.filter((agent) => agent.kind === kind);
    const staying = ofKind.filter((agent) => agent.leftAtMs === null);
    const leaving = ofKind.filter((agent) => agent.leftAtMs !== null);
    const target = sprites[kind];
    next.push(...staying.slice(0, target), ...leaving);
    for (const agent of staying.slice(target)) {
      next.push({ ...agent, leftAtMs: nowMs });
    }
    for (let i = staying.length; i < target; i++) {
      next.push(createAgent(kind, nextId++, nowMs, random));
    }
  }
  const leftTimes = next.flatMap((agent) => (agent.leftAtMs === null ? [] : [agent.leftAtMs]));
  const pruneAtMs = leftTimes.length > 0 ? Math.min(...leftTimes) + AGENT_FADE_MS : null;
  return { agents: next, rngState, nextId, pruneAtMs };
}

/** Bleibende Agenten je Typ (ohne ausblendende). */
export function activeAgentCounts(agents: SceneAgents): UnitCounts {
  const counts = { queens: 0, drones: 0, soldiers: 0 };
  for (const agent of agents.agents) {
    if (agent.leftAtMs === null) {
      counts[agent.kind]++;
    }
  }
  return counts;
}

/** Pendel einer Drohne: Hinweg nach innen ohne Last, Rückweg nach außen mit Last. */
export function dronePendulum(
  agent: Pick<SceneAgent, 'radius' | 'phaseMs'>,
  nowMs: number,
): { readonly radius: number; readonly loaded: boolean } {
  const distance = agent.radius - DRONE_INNER_RADIUS;
  const inMs = distance / DRONE_SPEED_IN;
  const periodMs = inMs + distance / DRONE_SPEED_OUT;
  const t = positiveModulo(nowMs + agent.phaseMs, periodMs);
  return t < inMs
    ? { radius: agent.radius - DRONE_SPEED_IN * t, loaded: false }
    : { radius: DRONE_INNER_RADIUS + DRONE_SPEED_OUT * (t - inMs), loaded: true };
}

/**
 * Lage eines Agenten zur Zeit `nowMs`. Unterwegs gibt es keine Futterstelle, die Drohnen tragen
 * dann nichts.
 */
export function agentPose(agent: SceneAgent, nowMs: number, traveling: boolean): AgentPose {
  const angle = agent.angle + agent.angularSpeed * nowMs;
  const pendulum = agent.kind === 'drones' ? dronePendulum(agent, nowMs) : null;
  const radius = pendulum?.radius ?? agent.radius;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return {
    x: cos * radius,
    y: sin * radius * ORBIT_Y_SCALE,
    // Tangente der Ellipse in Laufrichtung.
    heading: Math.atan2(cos * ORBIT_Y_SCALE * agent.angularSpeed, -sin * agent.angularSpeed),
    loaded: !traveling && (pendulum?.loaded ?? false),
    opacity: agentOpacity(agent, nowMs),
  };
}

export function agentOpacity(
  agent: Pick<SceneAgent, 'bornAtMs' | 'leftAtMs'>,
  nowMs: number,
): number {
  const fadeIn = clamp01((nowMs - agent.bornAtMs) / AGENT_FADE_MS);
  const fadeOut =
    agent.leftAtMs === null ? 1 : 1 - clamp01((nowMs - agent.leftAtMs) / AGENT_FADE_MS);
  return Math.min(fadeIn, fadeOut);
}

function createAgent(
  kind: UnitType,
  id: number,
  nowMs: number,
  random: (min: number, max: number) => number,
): SceneAgent {
  const angle = random(0, FULL_TURN);
  const base = { id, kind, angle, bornAtMs: nowMs, leftAtMs: null };
  switch (kind) {
    case 'drones': {
      const radius = random(...DRONE_HOME_RADIUS);
      const angularSpeed = random(...DRONE_ANGULAR_SPEED);
      const distance = radius - DRONE_INNER_RADIUS;
      const periodMs = distance / DRONE_SPEED_IN + distance / DRONE_SPEED_OUT;
      return { ...base, radius, angularSpeed, phaseMs: random(0, periodMs) };
    }
    case 'soldiers':
      return {
        ...base,
        radius: random(...SOLDIER_RADIUS),
        angularSpeed: random(...SOLDIER_ANGULAR_SPEED),
        phaseMs: 0,
      };
    case 'queens':
      return {
        ...base,
        radius: random(...QUEEN_RADIUS),
        angularSpeed: QUEEN_ANGULAR_SPEED,
        phaseMs: 0,
      };
  }
}

export function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
