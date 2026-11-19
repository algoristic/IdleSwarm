/** Farben der Szene aus den `--sw-*`-Tokens; der Renderer kennt keine Farbwerte. */
export interface ScenePalette {
  readonly skyTop: string;
  readonly skyMid: string;
  readonly skyBottom: string;
  readonly light: string;
  readonly hills: readonly [far: string, mid: string, near: string];
  /** Farbliste des Planktons (Index `Plankton.color`). */
  readonly plankton: readonly string[];
  readonly site: readonly [deep: string, base: string, light: string];
  readonly siteGlow: string;
  readonly siteGlowEnd: string;
  readonly shadow: string;
  readonly gloss: string;
  readonly highlight: string;
  readonly bubble: string;
  readonly bubbleHighlight: string;
  readonly drone: BallColors;
  readonly soldier: BallColors;
  readonly queen: BallColors;
  readonly food: BallColors;
}

/** Kugel im Flat-Stil: dunkler Grund und Körper. */
export interface BallColors {
  readonly base: string;
  readonly shade: string;
}

/** Liest die Tokens einmal (`getComputedStyle(documentElement)`). */
export function readScenePalette(
  style: Pick<CSSStyleDeclaration, 'getPropertyValue'>,
): ScenePalette {
  const token = (name: string): string => style.getPropertyValue(`--sw-${name}`).trim();
  const ball = (name: string): BallColors => ({ base: token(name), shade: token(`${name}-shade`) });
  return {
    skyTop: token('scene-sky-top'),
    skyMid: token('scene-sky-mid'),
    skyBottom: token('scene-sky-bottom'),
    light: token('scene-light'),
    hills: [token('scene-hill-far'), token('scene-hill-mid'), token('scene-hill-near')],
    plankton: [
      token('unit-drone'),
      token('scene-plankton-violet'),
      token('unit-soldier'),
      token('scene-food'),
      token('scene-plankton-muted'),
    ],
    site: [token('scene-site-deep'), token('scene-site'), token('scene-site-light')],
    siteGlow: token('scene-site-glow'),
    siteGlowEnd: token('scene-site-glow-end'),
    shadow: token('scene-shadow'),
    gloss: token('scene-gloss'),
    highlight: token('scene-highlight'),
    bubble: token('scene-bubble'),
    bubbleHighlight: token('scene-bubble-highlight'),
    drone: ball('unit-drone'),
    soldier: ball('unit-soldier'),
    queen: ball('unit-queen'),
    food: ball('scene-food'),
  };
}
