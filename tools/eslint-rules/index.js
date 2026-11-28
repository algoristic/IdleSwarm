module.exports = {
  meta: { name: 'local' },
  rules: {
    'file-name': require('./file-name'),
    'i18n-id': require('./i18n-id'),
    'inject-allowlist': require('./inject-allowlist'),
    'member-order': require('./member-order'),
    'no-doc-comments': require('./no-doc-comments'),
    'tailwind-classes': require('./tailwind-classes'),
    'template-conventions': require('./template-conventions'),
  },
};
