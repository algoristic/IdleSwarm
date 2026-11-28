const GROUPS = [
  'inject()',
  'Inputs',
  'Konstanten und Zustand',
  'Outputs',
  'View-Queries',
  'abgeleiteter Zustand (computed, linkedSignal)',
  '$localize-Texte',
  'privater Zustand (#name ohne Signal-API)',
  'Konstruktor und Lifecycle-Hooks',
  'Handler und öffentliche Methoden',
  'private Methoden (#name)',
];

const [
  INJECT,
  INPUT,
  CONSTANT,
  OUTPUT,
  QUERY,
  DERIVED,
  TEXT,
  PRIVATE_STATE,
  LIFECYCLE,
  METHOD,
  PRIVATE_METHOD,
] = GROUPS.map((_group, index) => index);

const CALLEE_GROUPS = {
  inject: INJECT,
  input: INPUT,
  model: INPUT,
  output: OUTPUT,
  outputFromObservable: OUTPUT,
  viewChild: QUERY,
  viewChildren: QUERY,
  contentChild: QUERY,
  contentChildren: QUERY,
  computed: DERIVED,
  linkedSignal: DERIVED,
};

const DECORATORS = ['Component', 'Directive', 'Pipe'];

/** @param {any} node */
const calleeName = (node) => {
  const callee = node?.type === 'CallExpression' ? node.callee : undefined;
  if (callee?.type === 'Identifier') {
    return callee.name;
  }
  if (callee?.type === 'MemberExpression' && callee.object.type === 'Identifier') {
    return callee.object.name;
  }
  return undefined;
};

/** @param {any} node */
const isCall = (node) => node?.type === 'CallExpression' || node?.type === 'NewExpression';

/** @param {any} node */
const containsLocalize = (node) => {
  if (!node || typeof node !== 'object') {
    return false;
  }
  if (node.type === 'TaggedTemplateExpression' && node.tag?.name === '$localize') {
    return true;
  }
  return Object.entries(node).some(
    ([key, value]) =>
      key !== 'parent' &&
      (Array.isArray(value) ? value.some(containsLocalize) : containsLocalize(value)),
  );
};

/** @param {any} member */
const groupOf = (member) => {
  if (member.type === 'MethodDefinition') {
    if (member.kind === 'constructor' || /^ng[A-Z]/.test(member.key.name ?? '')) {
      return LIFECYCLE;
    }
    return member.key.type === 'PrivateIdentifier' ? PRIVATE_METHOD : METHOD;
  }
  if (member.type !== 'PropertyDefinition') {
    return undefined;
  }
  const name = calleeName(member.value);
  if (name && name in CALLEE_GROUPS) {
    return CALLEE_GROUPS[/** @type {keyof typeof CALLEE_GROUPS} */ (name)];
  }
  if (containsLocalize(member.value)) {
    return TEXT;
  }
  const isPlainPrivate = member.key.type === 'PrivateIdentifier' && !isCall(member.value);
  return isPlainPrivate ? PRIVATE_STATE : CONSTANT;
};

/** @param {any} member */
const memberName = (member) =>
  member.kind === 'constructor'
    ? 'constructor'
    : `${member.key.type === 'PrivateIdentifier' ? '#' : ''}${member.key.name ?? '?'}`;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Feste Reihenfolge der Member in Komponenten, Direktiven und Pipes.' },
    schema: [],
    messages: {
      order:
        '„{{name}}“ ({{group}}) gehört vor „{{previous}}“ ({{previousGroup}}). Reihenfolge: {{groups}}.',
    },
  },
  create(context) {
    return {
      /** @param {any} node */
      ClassBody(node) {
        const decorators = node.parent.decorators ?? [];
        const decorated = decorators.some((/** @type {any} */ decorator) =>
          DECORATORS.includes(decorator.expression?.callee?.name),
        );
        if (!decorated) {
          return;
        }
        /** @type {{ member: any; group: number } | undefined} */
        let highest;
        for (const member of node.body) {
          const group = groupOf(member);
          if (group === undefined) {
            continue;
          }
          if (highest && group < highest.group) {
            context.report({
              node: member.key ?? member,
              messageId: 'order',
              data: {
                name: memberName(member),
                group: GROUPS[group],
                previous: memberName(highest.member),
                previousGroup: GROUPS[highest.group],
                groups: GROUPS.join(' → '),
              },
            });
            continue;
          }
          if (!highest || group > highest.group) {
            highest = { member, group };
          }
        }
      },
    };
  },
};
