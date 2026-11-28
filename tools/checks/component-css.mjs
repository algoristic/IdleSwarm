import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const COLOR = /#[0-9a-fA-F]{3,8}\b|\b(rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/;
const TAILWIND_AT_RULES =
  /@(apply|reference|theme|tailwind|config|plugin|utility|variant|custom-variant)\b/;
const HOST_LAYOUT =
  /^\s*(display|position|inset|top|right|bottom|left|margin[a-z-]*|width|height|min-[a-z-]+|max-[a-z-]+|flex[a-z-]*|grid[a-z-]*|order|align-self|justify-self|place-self)\s*:/;

/** @param {string} file */
const blockOf = (file) => basename(file).replace(/\.(component|page)\.css$/, '');

/**
 * @param {string} file
 * @param {string} css
 * @returns {string[]}
 */
export function cssProblems(file, css) {
  const block = blockOf(file);
  const bem = new RegExp(`^${block}(__[a-z0-9]+(-[a-z0-9]+)*)?(--[a-z0-9]+(-[a-z0-9]+)*)?$`);
  const source = css.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const selectors = [];

  source.split('\n').forEach((text, index) => {
    const line = `${file}:${index + 1}`;
    if (COLOR.test(text)) {
      problems.push(
        `${line} Farben nur als Token (var(--…)), nie als Hex-, RGB- oder andere Farbwerte.`,
      );
    }
    if (TAILWIND_AT_RULES.test(text)) {
      problems.push(
        `${line} Keine Tailwind-Direktiven (@apply, @reference, @theme …) in Komponenten-Styles.`,
      );
    }
    const opened = text.match(/^([^{}]*)\{/);
    if (opened) {
      selectors.push(opened[1].trim());
      for (const className of opened[1].matchAll(/\.(-?[_a-zA-Z][_a-zA-Z0-9-]*)/g)) {
        if (!bem.test(className[1])) {
          problems.push(
            `${line} Klasse „.${className[1]}“ folgt nicht BEM mit dem Block „${block}“ (${block}__element--modifier).`,
          );
        }
      }
    }
    const current = selectors.at(-1) ?? '';
    if (/:host\b/.test(current) && HOST_LAYOUT.test(text)) {
      problems.push(
        `${line} Kein display, keine Position und keine Größe auf :host: Komponenten-Styles schlagen Tailwinds Utilities; das Host-Styling setzt host: { class: … }.`,
      );
    }
    if (text.includes('}')) {
      selectors.pop();
    }
  });
  return problems;
}

/** @param {string} directory */
const cssFiles = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(component|page)\.css$/.test(entry.name))
    .map((entry) => join(entry.parentPath, entry.name));

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = cssFiles('src/app').flatMap((file) =>
    cssProblems(file, readFileSync(file, 'utf8')),
  );
  for (const problem of problems) {
    console.error(problem);
  }
  process.exit(problems.length > 0 ? 1 : 0);
}
