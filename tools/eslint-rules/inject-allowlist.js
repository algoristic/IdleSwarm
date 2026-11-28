/** @param {any} node */
const tokenName = (node) => {
  if (node?.type === 'Identifier') {
    return node.name;
  }
  if (node?.type === 'MemberExpression' && node.property.type === 'Identifier') {
    return node.property.name;
  }
  return undefined;
};

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: { description: 'inject() nur mit den Tokens, die die Schicht verwenden darf.' },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
        required: ['allow', 'message'],
        additionalProperties: false,
      },
    ],
    messages: { forbidden: '„{{name}}“ darf hier nicht injiziert werden: {{message}}' },
  },
  create(context) {
    const [{ allow, message }] = /** @type {[{ allow: string[]; message: string }]} */ (
      context.options
    );
    const patterns = allow.map((pattern) => new RegExp(pattern));
    return {
      /** @param {any} node */
      "CallExpression[callee.name='inject']"(node) {
        const name = tokenName(node.arguments[0]) ?? context.sourceCode.getText(node.arguments[0]);
        if (!patterns.some((pattern) => pattern.test(name))) {
          context.report({
            node: node.arguments[0] ?? node,
            messageId: 'forbidden',
            data: { name, message },
          });
        }
      },
    };
  },
};
