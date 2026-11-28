const ARBITRARY = /(^|\s)!?([a-z0-9-]+:)*!?-?[a-z][a-z0-9-]*-\[[^\]\s]+\](\/\S+)?(?=\s|$)/;
const ARBITRARY_PROPERTY = /(^|\s)([a-z0-9-]+:)*\[[a-z-]+:[^\]\s]+\](?=\s|$)/;

const UTILITY_PREFIX =
  /(^|\s)!?([a-z0-9-]+:)*-?(bg|text|border|ring|outline|fill|stroke|shadow|from|via|to|decoration|accent|caret|divide|placeholder|p[xytrbl]?|m[xytrbl]?|w|h|size|min-w|min-h|max-w|max-h|gap|gap-[xy]|space-[xy]|inset|top|left|right|bottom|z|opacity|grid-cols|grid-rows|col-span|row-span|rounded|font|leading|tracking|translate-[xy]|scale|rotate|duration|delay)-$/;

/** @param {string} text */
const isArbitrary = (text) => ARBITRARY.test(text) || ARBITRARY_PROPERTY.test(text);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Tailwind-Klassen ohne Arbitrary Values und nie aus Teilstrings zusammengesetzt.',
    },
    schema: [],
    messages: {
      arbitrary:
        'Keine Arbitrary Values in Tailwind-Klassen („{{text}}“): Farben sind Tokens in src/styles.css, Abstände, Größen und Typografie kommen aus der Tailwind-Skala.',
      composed:
        'Tailwind-Klassen vollständig schreiben, nicht zusammensetzen („{{text}}…“): Tailwind findet Klassen durch Scannen der Quellen. Varianten über ein computed-Mapping mit vollständigen Klassennamen.',
    },
  },
  create(context) {
    const parserServices = context.sourceCode.parserServices;
    const isTemplate = typeof parserServices?.convertNodeSourceSpanToLoc === 'function';

    /**
     * @param {string} text
     * @param {boolean} composed
     * @param {any} target
     */
    const check = (text, composed, target) => {
      const messageId = isArbitrary(text)
        ? 'arbitrary'
        : composed && UTILITY_PREFIX.test(text)
          ? 'composed'
          : undefined;
      if (messageId) {
        context.report({ ...target, messageId, data: { text: text.trim() } });
      }
    };

    if (isTemplate) {
      /** @param {any} node */
      const at = (node) => ({ loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan) });
      return {
        /** @param {any} node */
        "TextAttribute[name='class']"(node) {
          check(node.value, false, at(node));
        },
        /** @param {any} node */
        LiteralPrimitive(node) {
          if (typeof node.value === 'string') {
            check(
              node.value,
              node.parent?.type === 'Binary' && node.parent.left === node,
              at(node),
            );
          }
        },
        /** @param {any} node */
        TemplateLiteralElement(node) {
          check(node.text, node.parent?.elements?.at(-1) !== node, at(node));
        },
      };
    }

    return {
      /** @param {any} node */
      Literal(node) {
        if (typeof node.value === 'string') {
          const composed = node.parent?.type === 'BinaryExpression' && node.parent.left === node;
          check(node.value, composed, { node });
        }
      },
      /** @param {any} node */
      TemplateElement(node) {
        check(node.value.cooked ?? '', !node.tail, { node });
      },
    };
  },
};
