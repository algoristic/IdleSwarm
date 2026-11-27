import { DEFAULT_GAME_CONFIG } from './data/game-config.data';
import { GameConfig } from './models/game-config.model';
import { Site, SiteTypeId } from './models/site.model';
import { siteFillShare, timeUntilEmpty } from './site-logic';

const config: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  siteTypes: {
    ...DEFAULT_GAME_CONFIG.siteTypes,
    algae: { factor: 1, growth: 0.01 },
    seagrass: { factor: 1e5, growth: 0.004, threshold: 1e8, floorFraction: 0.01, goal: true },
  },
};

function site(type: SiteTypeId, stock: number, size: number, dead = false): Site {
  return {
    id: 1,
    type,
    zone: 0,
    x: 0,
    y: 0,
    size,
    stock,
    bornAt: 0,
    dead,
    removeAt: null,
    discovered: true,
    shape: 0,
  };
}

describe('siteFillShare', () => {
  it('is the share of the stock in the size', () => {
    expect(siteFillShare(site('algae', 250, 1000))).toBe(0.25);
  });

  it('is zero for a dried site and never negative', () => {
    expect(siteFillShare(site('algae', 250, 1000, true))).toBe(0);
    expect(siteFillShare(site('algae', -5, 1000))).toBe(0);
  });
});

describe('timeUntilEmpty', () => {
  it('divides the available food by the harvest rate', () => {
    expect(timeUntilEmpty(config, site('algae', 300, 1000), 4)).toBe(75);
  });

  it('keeps the floor of a site with a floor fraction', () => {
    expect(timeUntilEmpty(config, site('seagrass', 500, 1000), 7)).toBe(70);
  });

  it('is zero for a dried site', () => {
    expect(timeUntilEmpty(config, site('algae', 300, 1000, true), 4)).toBe(0);
  });
});
