import { PROTOTYPE_GAME_CONFIG } from '../../domain/prototype-game-config.fixture';
import {
  beadPositions,
  myelinStates,
  neuronOrganelles,
  reachMilestones,
  SWARM_DENDRITES,
} from './neuron.utils';

const MYELIN_Y = [42, 62, 82, 114, 134, 154];

const EXPECTED_CROP_LAST_BEAD = { cx: '101.4', cy: '-29.3', next: true };

const EXPECTED_AXON_STATES = {
  '0': {
    myelin: ['next', 'off', 'off', 'off', 'off', 'off'],
    milestones: [
      { y: 105.5, rank: 3, reach: 210, reached: false },
      { y: 177.5, rank: 6, reach: 280, reached: false },
    ],
  },
  '2': {
    myelin: ['on', 'on', 'next', 'off', 'off', 'off'],
    milestones: [
      { y: 105.5, rank: 3, reach: 210, reached: false },
      { y: 177.5, rank: 6, reach: 280, reached: false },
    ],
  },
  '3': {
    myelin: ['on', 'on', 'on', 'next', 'off', 'off'],
    milestones: [
      { y: 105.5, rank: 3, reach: 210, reached: true },
      { y: 177.5, rank: 6, reach: 280, reached: false },
    ],
  },
  '5': {
    myelin: ['on', 'on', 'on', 'on', 'on', 'next'],
    milestones: [
      { y: 105.5, rank: 3, reach: 210, reached: true },
      { y: 177.5, rank: 6, reach: 280, reached: false },
    ],
  },
  '6': {
    myelin: ['on', 'on', 'on', 'next', 'off', 'off'],
    milestones: [
      { y: 105.5, rank: 6, reach: 280, reached: true },
      { y: 177.5, rank: 9, reach: 350, reached: false },
    ],
  },
  '7': {
    myelin: ['on', 'on', 'on', 'on', 'next', 'off'],
    milestones: [
      { y: 105.5, rank: 6, reach: 280, reached: true },
      { y: 177.5, rank: 9, reach: 350, reached: false },
    ],
  },
  '10': {
    myelin: ['on', 'on', 'on', 'on', 'next', 'off'],
    milestones: [
      { y: 105.5, rank: 9, reach: 350, reached: true },
      { y: 177.5, rank: 12, reach: 420, reached: false },
    ],
  },
};

const EXPECTED_AXON = Object.fromEntries(
  Object.entries(EXPECTED_AXON_STATES).map(([rank, { myelin, milestones }]) => [
    rank,
    { myelin: myelin.map((state, j) => ({ y: MYELIN_Y[j], state })), milestones },
  ]),
);

describe('neuron utils', () => {
  describe('beadPositions', () => {
    it('places one bead per rank and the next one along the dendrite', () => {
      expect(beadPositions(SWARM_DENDRITES.hearth, 0)).toEqual([
        { cx: '-54.5', cy: '-52.3', next: true },
      ]);
      expect(beadPositions(SWARM_DENDRITES.hearth, 3)).toEqual([
        { cx: '-54.5', cy: '-52.3', next: false },
        { cx: '-67.0', cy: '-60.4', next: false },
        { cx: '-78.3', cy: '-69.8', next: false },
        { cx: '-88.5', cy: '-80.5', next: true },
      ]);
    });

    it('shows at most five beads and the next one', () => {
      const beads = beadPositions(SWARM_DENDRITES.crop, 7);
      expect(beads).toHaveLength(6);
      expect(beads.at(-1)).toEqual(EXPECTED_CROP_LAST_BEAD);
    });
  });

  describe('myelinStates and reachMilestones', () => {
    it.each(Object.entries(EXPECTED_AXON))('match the prototype for rank %s', (rank, expected) => {
      expect(myelinStates(Number(rank), PROTOTYPE_GAME_CONFIG.reach.every)).toEqual(
        expected.myelin,
      );
      expect(reachMilestones(PROTOTYPE_GAME_CONFIG, Number(rank))).toEqual(expected.milestones);
    });
  });

  describe('neuronOrganelles', () => {
    it('draws the organelles of seed 99 centred between both neurons', () => {
      const { organelles, specks } = neuronOrganelles(true);
      expect(organelles).toHaveLength(11);
      expect(specks).toHaveLength(60);
      expect(organelles[0]).toEqual({
        transform: 'translate(40 -260) rotate(-90)',
        x: -46,
        y: -23,
        width: 92,
        height: 46,
        rx: 23,
        midX: -41,
        midY: -18,
        midWidth: 82,
        midHeight: 36,
        midRx: 18,
        wave: 'M-32.199999999999996 0q7.8 -13.8 16.1 0q7.8 -13.8 16.1 0q7.8 -13.8 16.1 0q7.8 -13.8 16.1 0',
      });
      expect(organelles[10]?.transform).toBe('translate(380 640) rotate(84)');
      expect(organelles[10]?.wave).toBe(
        'M-35 0q8.5 -15.0 17.5 0q8.5 -15.0 17.5 0q8.5 -15.0 17.5 0q8.5 -15.0 17.5 0',
      );
      expect([specks[0], specks[29], specks[59]]).toEqual([
        { cx: '81', cy: '-281', r: '4.7' },
        { cx: '417', cy: '-451', r: '3.5' },
        { cx: '557', cy: '-330', r: '6.0' },
      ]);
    });

    it('shifts nothing without the chain neuron', () => {
      const { organelles, specks } = neuronOrganelles(false);
      expect(organelles[0]?.transform).toBe('translate(-150 -260) rotate(-90)');
      expect(organelles[10]?.transform).toBe('translate(190 640) rotate(84)');
      expect([specks[0], specks[29], specks[59]]).toEqual([
        { cx: '-109', cy: '-281', r: '4.7' },
        { cx: '227', cy: '-451', r: '3.5' },
        { cx: '367', cy: '-330', r: '6.0' },
      ]);
    });
  });
});
