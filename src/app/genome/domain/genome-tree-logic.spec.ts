import {
  branchPath,
  membranePath,
  MEMBRANE_RADIUS,
  nodeDecoration,
  organelle,
  polarPoint,
  TAG_HEIGHT,
  TAG_WIDTH,
  translate,
  TREE_CENTER,
} from './genome-tree-logic';

describe('genome-tree-logic', () => {
  it('rechnet Winkel in Grad im Uhrzeigersinn um das Zentrum um', () => {
    expect(polarPoint({ angle: 0, radius: 0 })).toEqual({ x: 400, y: 400 });
    expect(polarPoint({ angle: 0, radius: 100 })).toEqual({ x: 500, y: 400 });
    expect(polarPoint({ angle: 90, radius: 100 })).toEqual({ x: 400, y: 500 });
    expect(polarPoint({ angle: -90, radius: 50 })).toEqual({ x: 400, y: 350 });
    // Eine Nachkommastelle: cos(−150°) · 100 = −86,60…
    expect(polarPoint({ angle: -150, radius: 100 })).toEqual({ x: 313.4, y: 350 });
    expect(translate({ x: 313.4, y: 350 })).toBe('translate(313.4 350)');
  });

  it('biegt einen Ast über den mittleren Radius im Winkel des Elternknotens', () => {
    const parent = { angle: 0, radius: 100 };
    const child = { angle: 90, radius: 200 };
    // Kontrollpunkt bei 0° und Radius 150.
    expect(branchPath(parent, child, false)).toBe('M500 400 Q550 400 400 600');
  });

  it('nimmt an der Wurzel den Winkel des Kindes, damit der Ast gerade herauswächst', () => {
    const root = { angle: 0, radius: 0 };
    const child = { angle: 90, radius: 100 };
    expect(branchPath(root, child, true)).toBe('M400 400 Q400 450 400 500');
  });

  it('schließt die Membran und hält sie nahe am mittleren Radius', () => {
    const path = membranePath();
    expect(path.startsWith('M')).toBe(true);
    expect(path.endsWith(' Z')).toBe(true);
    const radii = [...path.matchAll(/[ML](-?[\d.]+) (-?[\d.]+)/g)].map(([, x, y]) =>
      Math.hypot(Number(x) - TREE_CENTER, Number(y) - TREE_CENTER),
    );
    expect(radii).toHaveLength(121);
    for (const radius of radii) {
      // Summe der Wellen-Amplituden 5 + 4, dazu Rundung.
      expect(Math.abs(radius - MEMBRANE_RADIUS)).toBeLessThanOrEqual(9.1);
    }
  });

  it('dreht Organellen in Umfangsrichtung und verkleinert den Kern', () => {
    expect(organelle({ angle: 0, radius: 100 }, 20, 10)).toEqual({
      transform: 'translate(500 400) rotate(90)',
      rx: 20,
      ry: 10,
      innerRx: 9,
      innerRy: 4.5,
    });
  });

  describe('nodeDecoration', () => {
    it('setzt Beschriftung und Schild unter den Knoten', () => {
      const deco = nodeDecoration(19, 'below', 'below');
      expect(deco.label).toEqual({ x: 0, y: 37, anchor: 'middle' });
      expect(deco.tag).toEqual({
        x: -TAG_WIDTH / 2,
        y: 45,
        width: TAG_WIDTH,
        height: TAG_HEIGHT,
        textX: 0,
        textY: 57,
      });
      expect([deco.pulseRadius, deco.selectionRadius, deco.focusRadius]).toEqual([24, 30, 33]);
    });

    it('setzt eine seitliche Beschriftung neben den Knoten und das Schild darunter', () => {
      const right = nodeDecoration(19, 'start', 'below');
      expect(right.label).toEqual({ x: 27, y: -4, anchor: 'start' });
      expect(right.tag.y).toBe(25);
      expect(right.tag.textX).toBe(0);
      expect(nodeDecoration(19, 'end', 'below').label).toEqual({ x: -27, y: -4, anchor: 'end' });
    });

    it('setzt das Schild gegenüber der Beschriftung auf Höhe der Mitte', () => {
      const tagLeft = nodeDecoration(19, 'start', 'opposite').tag;
      expect(tagLeft.x + tagLeft.width).toBe(-25);
      expect(tagLeft.y).toBe(-TAG_HEIGHT / 2);
      const tagRight = nodeDecoration(19, 'end', 'opposite').tag;
      expect(tagRight.x).toBe(25);
      // Unter einer Beschriftung darunter gibt es kein „gegenüber“.
      expect(nodeDecoration(19, 'below', 'opposite').tag.y).toBe(45);
    });
  });
});
