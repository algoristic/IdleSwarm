const path = require('node:path');

const SUFFIXES = ['component', 'page', 'directive', 'pipe'];

/** @param {string} text */
const camelCase = (text) =>
  text.replace(/[-.]([a-z0-9])/g, (_match, letter) => letter.toUpperCase());

/** @param {string} text */
const pascalCase = (text) => {
  const camel = camelCase(text);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

/**
 * Zerlegt `…/src/app/<domain>/<layer>/…/<name>[.<suffix>].<ext>` in die Teile, aus denen
 * Klassennamen und i18n-IDs abgeleitet werden.
 *
 * @param {string} filename
 */
const parseSourceFile = (filename) => {
  const normalized = filename.split(path.sep).join('/');
  const file = path.posix.basename(normalized);
  const stem = file.replace(/\.(ts|html)$/, '');
  const suffix = SUFFIXES.find((candidate) => stem.endsWith(`.${candidate}`));
  const name = suffix ? stem.slice(0, -(suffix.length + 1)) : stem;
  const match = /\/src\/app\/([^/]+)\/([^/]+)\//.exec(normalized);
  return {
    path: normalized,
    file,
    name,
    suffix,
    domain: match?.[1],
    layer: match?.[2],
  };
};

module.exports = { camelCase, pascalCase, parseSourceFile };
