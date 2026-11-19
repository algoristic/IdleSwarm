/** Farbe der Füllung: Akzent oder Orange der Futterstelle (Mockup `--orange`). */
export const HUD_METER_TONES = ['accent', 'site'] as const;
export type HudMeterTone = (typeof HUD_METER_TONES)[number];

export const HUD_METER_SIZES = ['md', 'sm'] as const;
export type HudMeterSize = (typeof HUD_METER_SIZES)[number];
