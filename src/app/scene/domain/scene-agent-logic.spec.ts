import type { SceneAgent } from './models/scene.model';
import {
  activeAgentCounts,
  AGENT_FADE_MS,
  agentOpacity,
  agentPose,
  createSceneAgents,
  DRONE_INNER_RADIUS,
  dronePendulum,
  syncAgents,
} from './scene-agent-logic';

const counts = (queens: number, drones: number, soldiers: number) => ({ queens, drones, soldiers });

describe('syncAgents', () => {
  it('erzeugt die Agenten deterministisch aus dem Szene-Seed', () => {
    const a = syncAgents(createSceneAgents(), counts(2, 10, 5), 0);
    const b = syncAgents(createSceneAgents(), counts(2, 10, 5), 0);
    expect(a).toEqual(b);
    expect(activeAgentCounts(a)).toEqual(counts(2, 10, 5));
    expect(new Set(a.agents.map((agent) => agent.id)).size).toBe(17);
  });

  it('behält vorhandene Agenten und ergänzt nur neue', () => {
    const before = syncAgents(createSceneAgents(), counts(1, 4, 0), 0);
    const after = syncAgents(before, counts(1, 6, 0), 1000);
    for (const agent of before.agents) {
      expect(after.agents).toContainEqual(agent);
    }
    const added = after.agents.filter((agent) => agent.bornAtMs === 1000);
    expect(added.map((agent) => agent.kind)).toEqual(['drones', 'drones']);
  });

  it('blendet überzählige Agenten aus und entfernt sie danach', () => {
    const before = syncAgents(createSceneAgents(), counts(0, 5, 0), 0);
    const shrunk = syncAgents(before, counts(0, 3, 0), 1000);
    expect(shrunk.agents).toHaveLength(5);
    expect(activeAgentCounts(shrunk)).toEqual(counts(0, 3, 0));
    expect(shrunk.pruneAtMs).toBe(1000 + AGENT_FADE_MS);

    const pruned = syncAgents(shrunk, counts(0, 3, 0), 1000 + AGENT_FADE_MS);
    expect(pruned.agents).toHaveLength(3);
    expect(pruned.pruneAtMs).toBeNull();
    expect(pruned.agents.map((agent) => agent.id)).toEqual(
      before.agents.slice(0, 3).map((agent) => agent.id),
    );
  });
});

describe('agentOpacity', () => {
  it('blendet nach der Geburt ein und nach dem Weggang aus', () => {
    const agent = { bornAtMs: 0, leftAtMs: null };
    expect(agentOpacity(agent, 0)).toBe(0);
    expect(agentOpacity(agent, AGENT_FADE_MS / 2)).toBeCloseTo(0.5);
    expect(agentOpacity(agent, AGENT_FADE_MS)).toBe(1);
    expect(agentOpacity({ bornAtMs: 0, leftAtMs: 5000 }, 5000 + AGENT_FADE_MS)).toBe(0);
  });
});

describe('dronePendulum', () => {
  const drone = { radius: 200, phaseMs: 0 };

  it('fliegt ohne Last nach innen und mit Last zurück', () => {
    const start = dronePendulum(drone, 0);
    expect(start).toEqual({ radius: 200, loaded: false });

    const inward = dronePendulum(drone, 500);
    expect(inward.loaded).toBe(false);
    expect(inward.radius).toBeLessThan(200);

    // Hinweg 115 px bei 0,9 px je Frame (60 fps) ≈ 2130 ms, danach beginnt der Rückweg.
    const turned = dronePendulum(drone, 2200);
    expect(turned.loaded).toBe(true);
    expect(turned.radius).toBeGreaterThanOrEqual(DRONE_INNER_RADIUS);
  });

  it('ist periodisch und bleibt zwischen den Wendepunkten', () => {
    for (let t = 0; t < 20_000; t += 137) {
      const { radius } = dronePendulum(drone, t);
      expect(radius).toBeGreaterThanOrEqual(DRONE_INNER_RADIUS - 1e-9);
      expect(radius).toBeLessThanOrEqual(200 + 1e-9);
    }
  });
});

describe('agentPose', () => {
  const soldier: SceneAgent = {
    id: 0,
    kind: 'soldiers',
    angle: 0,
    angularSpeed: -0.001,
    radius: 250,
    phaseMs: 0,
    bornAtMs: -AGENT_FADE_MS,
    leftAtMs: null,
  };

  it('setzt Soldaten auf ihre Ellipse und richtet sie in Laufrichtung aus', () => {
    const pose = agentPose(soldier, 0, false);
    expect(pose.x).toBeCloseTo(250);
    expect(pose.y).toBeCloseTo(0);
    // Gegen den Uhrzeigersinn (negative Winkelgeschwindigkeit) bei Winkel 0: nach oben.
    expect(pose.heading).toBeCloseTo(-Math.PI / 2);
    expect(pose.opacity).toBe(1);
  });

  it('lässt Drohnen unterwegs nichts tragen', () => {
    const drone: SceneAgent = { ...soldier, kind: 'drones', radius: 200, angularSpeed: 0.0002 };
    expect(agentPose(drone, 2200, false).loaded).toBe(true);
    expect(agentPose(drone, 2200, true).loaded).toBe(false);
  });
});
