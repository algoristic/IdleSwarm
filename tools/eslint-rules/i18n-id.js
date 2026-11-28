const { camelCase, parseSourceFile } = require('./source-file');

const LAYERS = ['feature', 'ui', 'data-access', 'domain', 'util'];

/**
 * Erwartetes Präfix `@@<layer><Domain>-<componentOrClass>-` für eine Datei, oder `undefined`
 * außerhalb von `src/app/<domain>/<layer>/`.
 *
 * @param {string} filename
 */
const expectedPrefix = (filename) => {
  const { domain, layer, name } = parseSourceFile(filename);
  if (!domain || !layer || !LAYERS.includes(layer)) {
    return undefined;
  }
  const domainPart = domain.charAt(0).toUpperCase() + camelCase(domain.slice(1));
  return `${camelCase(layer)}${domainPart}-${camelCase(name)}-`;
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'i18n-IDs folgen dem Schema @@<layer><Domain>-<componentOrClass>-<key>.',
    },
    schema: [],
    messages: {
      wrongPrefix:
        'Die i18n-ID „{{id}}“ muss mit „{{prefix}}“ beginnen (Schema @@<layer><Domain>-<componentOrClass>-<key>, abgeleitet aus Schicht, Domäne und Dateiname; eine ID nie für einen anderen Text wiederverwenden).',
    },
  },
  create(context) {
    const prefix = expectedPrefix(context.filename);
    if (!prefix) {
      return {};
    }
    const seen = new WeakSet();

    /**
     * @param {string} id
     * @param {import('eslint').Rule.ReportDescriptor['loc'] | undefined} loc
     * @param {import('estree').Node | undefined} node
     */
    const check = (id, loc, node) => {
      if (id.startsWith(prefix) && id.length > prefix.length) {
        return;
      }
      context.report({
        ...(node ? { node } : { loc: /** @type {import('eslint').AST.SourceLocation} */ (loc) }),
        messageId: 'wrongPrefix',
        data: { id, prefix },
      });
    };

    const parserServices = context.sourceCode.parserServices;
    const isTemplate = typeof parserServices?.convertNodeSourceSpanToLoc === 'function';

    if (isTemplate) {
      return {
        /** @param {any} node */
        '*'(node) {
          const i18n = node.i18n;
          const customId = i18n?.customId;
          if (!customId || seen.has(i18n)) {
            return;
          }
          seen.add(i18n);
          const span = node.keySpan ?? node.sourceSpan;
          check(customId, parserServices.convertNodeSourceSpanToLoc(span), undefined);
        },
      };
    }

    return {
      /** @param {import('estree').TaggedTemplateExpression} node */
      "TaggedTemplateExpression[tag.name='$localize']"(node) {
        const head = node.quasi.quasis[0]?.value.cooked ?? '';
        const match = /^:@@([^:]+):/.exec(head);
        if (match) {
          check(match[1], undefined, node);
        }
      },
    };
  },
};
