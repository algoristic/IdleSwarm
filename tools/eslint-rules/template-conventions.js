const INTERACTIVE = ['a', 'button', 'input', 'select', 'textarea'];

/** @param {any} element */
const attributeNames = (element) =>
  [...(element.attributes ?? []), ...(element.inputs ?? [])].map(
    (/** @type {any} */ attribute) => attribute.name,
  );

/** @param {any} node */
const isEventBinding = (node) => {
  for (let current = node; current; current = current.parent) {
    if (current.type === 'BoundEvent') {
      return true;
    }
  }
  return false;
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Test-IDs an interaktiven Elementen, keine Methodenaufrufe mit Argumenten in Bindungen.',
    },
    schema: [],
    messages: {
      testId:
        'Interaktive Elemente (<{{name}}> oder mit (click)) brauchen data-testid nach dem Schema <feature>.<bereich>.<element>, dynamisch über [attr.data-testid].',
      call: 'Templates rufen außer Event-Handlern und Signals keine Methoden auf: „{{text}}“ als computed oder Viewmodel ableiten, Werte über die Pipes aus shared/ui/pipes formatieren.',
    },
  },
  create(context) {
    const parserServices = context.sourceCode.parserServices;
    if (typeof parserServices?.convertNodeSourceSpanToLoc !== 'function') {
      return {};
    }
    const source = context.sourceCode;
    /** @param {any} node */
    const at = (node) => ({ loc: parserServices.convertNodeSourceSpanToLoc(node.sourceSpan) });
    /** @param {any} node */
    const atExpression = (node) => ({
      loc: {
        start: source.getLocFromIndex(node.sourceSpan.start),
        end: source.getLocFromIndex(node.sourceSpan.end),
      },
    });

    return {
      /** @param {any} node */
      Element(node) {
        const names = attributeNames(node);
        const clickable = (node.outputs ?? []).some(
          (/** @type {any} */ output) => output.name === 'click',
        );
        const disabled = names.includes('disabled') && !clickable;
        if (
          (INTERACTIVE.includes(node.name) || clickable) &&
          !disabled &&
          !names.includes('data-testid')
        ) {
          context.report({ ...at(node), messageId: 'testId', data: { name: node.name } });
        }
      },
      /** @param {any} node */
      'Call, SafeCall'(node) {
        if (node.args.length === 0 || isEventBinding(node)) {
          return;
        }
        const text = source.text.slice(node.sourceSpan.start, node.sourceSpan.end);
        context.report({ ...atExpression(node), messageId: 'call', data: { text } });
      },
    };
  },
};
