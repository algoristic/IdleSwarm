export const BUTTON_VARIANTS = ['default', 'warn', 'gold'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];
