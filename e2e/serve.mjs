// Statischer Server für den Produktions-Build (E2E): liefert `dist/idle-swarm/browser` unter dem
// Pfad aus `--base` aus, unbekannte Pfade ohne Dateiendung bekommen `index.html` (SPA-Fallback).
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    base: { type: 'string', default: '/' },
    port: { type: 'string', default: '4300' },
    root: { type: 'string', default: 'dist/idle-swarm/browser' },
  },
});
const root = resolve(values.root);
const base = values.base.endsWith('/') ? values.base : `${values.base}/`;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

async function fileFor(pathname) {
  const relative = normalize(decodeURIComponent(pathname.slice(base.length)));
  const candidate = join(root, relative);
  if (!candidate.startsWith(root)) {
    return null;
  }
  try {
    const info = await stat(candidate);
    if (info.isFile()) {
      return candidate;
    }
  } catch {
    // fällt auf index.html zurück
  }
  return extname(relative) === '' ? join(root, 'index.html') : null;
}

createServer(async (request, response) => {
  const { pathname } = new URL(request.url ?? '/', 'http://localhost');
  const file = pathname.startsWith(base) ? await fileFor(pathname) : null;
  if (file === null) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {
    'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  createReadStream(file).pipe(response);
}).listen(Number(values.port), '127.0.0.1');
