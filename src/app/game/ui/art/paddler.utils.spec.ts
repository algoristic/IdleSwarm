import { SWARM_FIXTURE } from '../scene/swarm.fixture';
import { paddlerParams } from './paddler.utils';

describe('paddlerParams', () => {
  it.each(SWARM_FIXTURE.paddlers)('folgt dem Prototyp für i = $i', ({ i, rMin, rVar, params }) => {
    expect(paddlerParams(i, rMin, rVar)).toEqual({
      radius: params.rr,
      duration: params.dur,
      reverse: params.rev,
      start: params.start,
      roll: params.roll,
      paddleDelay: params.padDelay,
      rollDelay: params.rollDelay,
    });
  });
});
