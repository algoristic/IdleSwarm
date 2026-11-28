/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keine JSDoc-Kommentare und keine Abschnittsbanner.' },
    schema: [],
    messages: {
      jsdoc:
        'Kein JSDoc: Was der Code tut und warum, zeigen Namen, Typen und kleine Funktionen. Kommentare nur für Ausnahmen, die sich im Code nicht ausdrücken lassen, knapp und mit Verweis auf Issue oder ADR.',
      banner:
        'Keine Abschnittsbanner in Kommentaren; Struktur entsteht durch Dateien und Funktionen.',
    },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (comment.type === 'Block' && comment.value.startsWith('*')) {
            context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: 'jsdoc' });
          } else if (/^[\s*]*([-=#*~_]{3,}|\S.*[-=]{4,})\s*$/.test(comment.value)) {
            context.report({ loc: comment.loc ?? { line: 1, column: 0 }, messageId: 'banner' });
          }
        }
      },
    };
  },
};
