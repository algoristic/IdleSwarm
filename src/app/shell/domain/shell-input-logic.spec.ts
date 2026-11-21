import {
  shortcutMode,
  ShortcutKeyPress,
  WHEEL_LOCK_MS,
  wheelDeltaPixels,
  wheelZoom,
} from './shell-input-logic';

describe('wheelDeltaPixels', () => {
  it('rechnet Zeilen und Seiten in Pixel um', () => {
    expect(wheelDeltaPixels(-120, 0, 800)).toBe(-120);
    expect(wheelDeltaPixels(3, 1, 800)).toBe(48);
    expect(wheelDeltaPixels(-1, 2, 800)).toBe(-800);
  });
});

describe('wheelZoom', () => {
  it('zoomt nach unten hinaus und nach oben hinein (Mockup)', () => {
    expect(wheelZoom(100, 0, 0)?.direction).toBe('out');
    expect(wheelZoom(-100, 0, 0)?.direction).toBe('in');
  });

  it('ignoriert Ausschläge unter 4 Pixeln', () => {
    expect(wheelZoom(3.9, 0, 0)).toBeNull();
    expect(wheelZoom(-3.9, 0, 0)).toBeNull();
    expect(wheelZoom(4, 0, 0)?.direction).toBe('out');
  });

  it('sperrt 900 ms nach einem Wechsel', () => {
    const first = wheelZoom(100, 1000, 0);
    expect(first?.lockedUntilMs).toBe(1000 + WHEEL_LOCK_MS);

    const lockedUntil = first?.lockedUntilMs ?? 0;
    expect(wheelZoom(100, 1000 + 899, lockedUntil)).toBeNull();
    expect(wheelZoom(-100, 1000 + 900, lockedUntil)?.direction).toBe('in');
  });
});

describe('shortcutMode', () => {
  const press = (key: string, extra: Partial<ShortcutKeyPress> = {}): ShortcutKeyPress => ({
    key,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    isComposing: false,
    defaultPrevented: false,
    ...extra,
  });

  it('ordnet W, G und Esc den Modi zu, unabhängig von der Großschreibung', () => {
    expect(shortcutMode(press('w'))).toBe('map');
    expect(shortcutMode(press('W'))).toBe('map');
    expect(shortcutMode(press('g'))).toBe('gen');
    expect(shortcutMode(press('Escape'))).toBe('scene');
    expect(shortcutMode(press('e'))).toBeNull();
    expect(shortcutMode(press('Enter'))).toBeNull();
  });

  it('löst für gesperrte Modi nichts aus (Onboarding)', () => {
    expect(shortcutMode(press('w'), ['scene'])).toBeNull();
    expect(shortcutMode(press('g'), ['map', 'scene'])).toBeNull();
    expect(shortcutMode(press('w'), ['map', 'scene'])).toBe('map');
    expect(shortcutMode(press('Escape'), ['scene'])).toBe('scene');
  });

  it('löst mit Strg, Alt oder Meta, beim Halten und in IME-Eingaben nichts aus', () => {
    expect(shortcutMode(press('w', { ctrlKey: true }))).toBeNull();
    expect(shortcutMode(press('g', { altKey: true }))).toBeNull();
    expect(shortcutMode(press('w', { metaKey: true }))).toBeNull();
    expect(shortcutMode(press('g', { repeat: true }))).toBeNull();
    expect(shortcutMode(press('Escape', { isComposing: true }))).toBeNull();
    expect(shortcutMode(press('Escape', { defaultPrevented: true }))).toBeNull();
  });
});
