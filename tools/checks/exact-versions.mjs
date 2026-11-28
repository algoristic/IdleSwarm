import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const SECTIONS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const EXACT = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

/**
 * @param {Record<string, unknown>} manifest
 * @returns {string[]}
 */
export function inexactVersions(manifest) {
  return SECTIONS.flatMap((section) =>
    Object.entries(/** @type {Record<string, string>} */ (manifest[section] ?? {}))
      .filter(([, version]) => !EXACT.test(version))
      .map(([name, version]) => `${section}: ${name} „${version}“`),
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const problems = inexactVersions(JSON.parse(readFileSync('package.json', 'utf8')));
  if (problems.length > 0) {
    console.error(
      'Versionen in package.json sind exakt (z. B. "4.3.5"), nie ^, ~, >=, * oder Bereiche; Updates sind bewusste Versionssprünge:',
    );
    for (const problem of problems) {
      console.error(`  ${problem}`);
    }
    process.exit(1);
  }
}
