export const UPGRADE_IDS = ['hearth', 'digestion', 'flagella', 'crop'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];

export const UPGRADE_PURCHASES = ['free', 'paid', 'unaffordable'] as const;
export type UpgradePurchase = (typeof UPGRADE_PURCHASES)[number];

export const CHAIN_UPGRADE_PURCHASES = ['paid', 'unaffordable', 'disabled'] as const;
export type ChainUpgradePurchase = (typeof CHAIN_UPGRADE_PURCHASES)[number];
