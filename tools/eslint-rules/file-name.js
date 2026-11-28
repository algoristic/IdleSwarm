const { pascalCase, parseSourceFile } = require('./source-file');

const DECORATOR_SUFFIXES = {
  Component: ['component', 'page'],
  Directive: ['directive'],
  Pipe: ['pipe'],
};

/** @param {string} suffix */
const classSuffix = (suffix) => pascalCase(suffix);

/** @param {any} node */
const decoratorName = (node) => node.expression?.callee?.name ?? node.expression?.name;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Dateiname, Klassenname und Ordner passen zusammen; Typen von Komponenten liegen in *.model.ts.',
    },
    schema: [],
    messages: {
      wrongFile:
        'Eine Klasse mit @{{decorator}} liegt in einer Datei {{expected}}, nicht in „{{file}}“.',
      wrongClass:
        'Die Klasse in „{{file}}“ heißt „{{expected}}“ (Dateiname in PascalCase plus Suffix), nicht „{{actual}}“.',
      dialogFolder:
        'Dialoginhalte liegen in dialog-<name>/, nicht in „{{folder}}“ (Rollen-Präfixe nur dialog- und form-).',
      exportedType:
        'Typen einer Komponente liegen in <name>.model.ts neben ihr, gemeinsame in models/<name>.model.ts.',
    },
  },
  create(context) {
    const source = parseSourceFile(context.filename);
    const dialogFolder = source.path.split('/').find((segment) => /.-dialog$/.test(segment));
    const isComponentFile = source.suffix === 'component' || source.suffix === 'page';

    return {
      Program(node) {
        if (dialogFolder) {
          context.report({ node, messageId: 'dialogFolder', data: { folder: dialogFolder } });
        }
      },
      /** @param {any} node */
      'ExportNamedDeclaration > :matches(TSInterfaceDeclaration, TSTypeAliasDeclaration)'(node) {
        if (isComponentFile) {
          context.report({ node, messageId: 'exportedType' });
        }
      },
      /** @param {any} node */
      ClassDeclaration(node) {
        const decorator = (node.decorators ?? [])
          .map(decoratorName)
          .find((name) => name in DECORATOR_SUFFIXES);
        if (!decorator || !node.id) {
          return;
        }
        /** @type {string[]} */
        const allowed =
          DECORATOR_SUFFIXES[/** @type {keyof typeof DECORATOR_SUFFIXES} */ (decorator)];
        if (!source.suffix || !allowed.includes(source.suffix)) {
          context.report({
            node: node.id,
            messageId: 'wrongFile',
            data: {
              decorator,
              expected: allowed.map((suffix) => `<name>.${suffix}.ts`).join(' oder '),
              file: source.file,
            },
          });
          return;
        }
        const expected = `${pascalCase(source.name)}${classSuffix(source.suffix)}`;
        if (node.id.name !== expected) {
          context.report({
            node: node.id,
            messageId: 'wrongClass',
            data: { file: source.file, expected, actual: node.id.name },
          });
        }
      },
    };
  },
};
