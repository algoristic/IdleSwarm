export const UPGRADE_IDS = ['hearth', 'digestion', 'flagella', 'crop'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
