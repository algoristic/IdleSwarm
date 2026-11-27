import { Find } from './models/find.model';
import { GameState } from './models/game-state.model';
import { Site } from './models/site.model';
import { Travel } from './models/travel.model';
import { travelDestination, travelProgress, travelRemainingTime } from './travel-logic';

const site: Site = {
  id: 3,
  type: 'algae',
  zone: 0,
  x: 10,
  y: 0,
  size: 100,
  stock: 100,
  bornAt: 0,
  dead: false,
  removeAt: null,
  discovered: true,
  shape: 0,
};
const find: Find = { id: 4, type: 'eggBall', zone: 0, x: 0, y: 10 };

function travel(kind: Travel['kind'], targetId: number, distance = 100, covered = 40): Travel {
  return { kind, targetId, fromX: 0, fromY: 0, toX: 0, toY: 0, distance, covered };
}

function state(current: Travel | null): Pick<GameState, 'travel' | 'sites' | 'finds'> {
  return { travel: current, sites: [site], finds: [find] };
}

describe('travelRemainingTime', () => {
  it('divides the remaining distance by the speed', () => {
    expect(travelRemainingTime(travel('site', 3), 20)).toBe(3);
  });
});

describe('travelProgress', () => {
  it('is the covered share of the distance', () => {
    expect(travelProgress(travel('site', 3))).toBe(0.4);
  });

  it('is complete without distance and never above one', () => {
    expect(travelProgress(travel('site', 3, 0, 0))).toBe(1);
    expect(travelProgress(travel('site', 3, 100, 120))).toBe(1);
  });
});

describe('travelDestination', () => {
  it('finds the site or the find of the travel', () => {
    expect(travelDestination(state(travel('site', 3)))).toEqual({ kind: 'site', site });
    expect(travelDestination(state(travel('find', 4)))).toEqual({ kind: 'find', find });
  });

  it('is null without travel or without target', () => {
    expect(travelDestination(state(null))).toBeNull();
    expect(travelDestination(state(travel('site', 4)))).toBeNull();
    expect(travelDestination(state(travel('find', 3)))).toBeNull();
  });
});
