import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { cssProblems } from './component-css.mjs';
import { inexactVersions } from './exact-versions.mjs';

describe('inexactVersions', () => {
  it('akzeptiert exakte Versionen', () => {
    assert.deepEqual(
      inexactVersions({ dependencies: { a: '1.2.3' }, devDependencies: { b: '4.0.0-rc.1' } }),
      [],
    );
  });

  it('meldet Bereiche und Platzhalter', () => {
    const manifest = {
      dependencies: { a: '^1.2.3', b: '~1.0.0' },
      devDependencies: { c: '>=2.0.0', d: '*', e: 'latest' },
    };
    assert.equal(inexactVersions(manifest).length, 5);
  });
});

describe('cssProblems', () => {
  const file = 'src/app/game/ui/hud/hud.component.css';

  it('akzeptiert BEM mit dem Block der Datei, Tokens und :host ohne Layout', () => {
    const css = [
      ':host(.hud--collapsed) {',
      '  transform: translateY(var(--spacing));',
      '}',
      '.hud__pills--wide {',
      '  color: var(--fg);',
      '}',
      '@media (width >= 40rem) {',
      '  .hud {',
      '    gap: calc(var(--spacing) * 1.5);',
      '  }',
      '}',
    ].join('\n');
    assert.deepEqual(cssProblems(file, css), []);
  });

  it('meldet fremde Blöcke und Nicht-BEM-Klassen', () => {
    assert.equal(cssProblems(file, '.pill__value {\n}\n.hud_pills {\n}').length, 2);
  });

  it('meldet Farbwerte und Tailwind-Direktiven', () => {
    const css = '.hud {\n  color: #fff;\n  background: rgb(0 0 0);\n  @apply p-2;\n}';
    assert.equal(cssProblems(file, css).length, 3);
  });

  it('meldet Layout auf :host', () => {
    assert.equal(cssProblems(file, ':host {\n  display: block;\n}').length, 1);
  });

  it('ignoriert Kommentare', () => {
    assert.deepEqual(cssProblems(file, '/* #fff .foo { */\n.hud {\n}'), []);
  });
});
