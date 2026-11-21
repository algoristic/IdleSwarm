// Erzeugt die App-Icons (SVG-Quelle, PNGs, favicon.ico) aus einer Formliste, ohne Abhängigkeiten.
// Aufruf: node tools/make-icons.mjs public
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const out = process.argv[2];
mkdirSync(join(out, 'icons'), { recursive: true });

const C = {
  bg: '#12144a', // --sw-bg-deep
  glow: '#1d2170', // --sw-bg-glow
  drone: '#2ee6c8', // --sw-unit-drone (= --sw-accent)
  droneShade: '#20a18c', // --sw-unit-drone-shade
  fg: '#f4f1ff', // --sw-fg
  food: '#ffd23f', // --sw-primary
  foodShade: '#c9940c', // --sw-primary-shade
};

// Motiv im 512er-Raster: Drohne der Aktionsleiste (vergrößert) mit Nahrungskugel und zwei kleinen Drohnen.
function motif() {
  const s = 9;
  const t = (x, y) => [240 + (x - 20) * s, 270 + (y - 22) * s];
  const [hx, hy] = t(14.6, 16.5);
  const [nx, ny] = t(21.5, 23.5);
  const [fsx, fsy] = t(31, 13);
  const [fx, fy] = t(30.3, 12.3);
  const small = (cx, cy, r) => [
    { kind: 'circle', cx, cy, r, fill: C.droneShade },
    { kind: 'circle', cx: cx - r * 0.12, cy: cy - r * 0.12, r: r * 0.85, fill: C.drone },
    { kind: 'circle', cx: cx + r * 0.15, cy: cy + r * 0.15, r: r * 0.31, fill: C.droneShade },
  ];
  return [
    { kind: 'circle', cx: 256, cy: 256, r: 196, fill: C.glow },
    ...small(130, 150, 34),
    ...small(372, 372, 30),
    { kind: 'circle', cx: 240, cy: 270, r: 99, fill: C.droneShade },
    { kind: 'circle', cx: t(18.7, 0)[0], cy: t(0, 20.7)[1], r: 9.4 * s, fill: C.drone },
    {
      kind: 'ellipse',
      cx: hx,
      cy: hy,
      rx: 2.4 * s,
      ry: 1.4 * s,
      rot: -35,
      fill: C.fg,
      opacity: 0.6,
    },
    { kind: 'circle', cx: nx, cy: ny, r: 3.4 * s, fill: C.droneShade },
    { kind: 'circle', cx: fsx, cy: fsy, r: 4.5 * s, fill: C.foodShade },
    { kind: 'circle', cx: fx, cy: fy, r: 3.6 * s, fill: C.food },
  ];
}

// `any`: abgerundetes Quadrat; `maskable`: vollflächig, Motiv liegt innerhalb der Safe-Zone (r = 40 %).
function shapes(variant) {
  const bg =
    variant === 'maskable'
      ? { kind: 'rect', x: 0, y: 0, w: 512, h: 512, rx: 0, fill: C.bg }
      : { kind: 'rect', x: 0, y: 0, w: 512, h: 512, rx: 112, fill: C.bg };
  return [bg, ...motif()];
}

const f = (n) => Number(n.toFixed(2));

function toSvg(list) {
  const body = list
    .map((sh) => {
      const op = sh.opacity === undefined ? '' : ` opacity="${sh.opacity}"`;
      if (sh.kind === 'rect') {
        return `  <rect width="${sh.w}" height="${sh.h}"${sh.rx ? ` rx="${sh.rx}"` : ''} fill="${sh.fill}"/>`;
      }
      if (sh.kind === 'circle') {
        return `  <circle cx="${f(sh.cx)}" cy="${f(sh.cy)}" r="${f(sh.r)}" fill="${sh.fill}"${op}/>`;
      }
      return `  <ellipse cx="${f(sh.cx)}" cy="${f(sh.cy)}" rx="${f(sh.rx)}" ry="${f(sh.ry)}" transform="rotate(${sh.rot} ${f(sh.cx)} ${f(sh.cy)})" fill="${sh.fill}"${op}/>`;
    })
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">\n${body}\n</svg>\n`;
}

function inside(sh, x, y) {
  if (sh.kind === 'circle') {
    return (x - sh.cx) ** 2 + (y - sh.cy) ** 2 <= sh.r ** 2;
  }
  if (sh.kind === 'ellipse') {
    const a = (-sh.rot * Math.PI) / 180;
    const dx = x - sh.cx;
    const dy = y - sh.cy;
    const u = dx * Math.cos(a) - dy * Math.sin(a);
    const v = dx * Math.sin(a) + dy * Math.cos(a);
    return (u / sh.rx) ** 2 + (v / sh.ry) ** 2 <= 1;
  }
  if (x < sh.x || y < sh.y || x > sh.x + sh.w || y > sh.y + sh.h) return false;
  const r = sh.rx;
  if (r === 0) return true;
  const qx = Math.max(sh.x + r - x, 0, x - (sh.x + sh.w - r));
  const qy = Math.max(sh.y + r - y, 0, y - (sh.y + sh.h - r));
  return qx * qx + qy * qy <= r * r;
}

const rgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

function rasterize(list, size) {
  const ss = 4;
  const px = new Uint8Array(size * size * 4);
  const scale = 512 / size;
  const cols = list.map((sh) => rgb(sh.fill));
  for (let py = 0; py < size; py++) {
    for (let pxi = 0; pxi < size; pxi++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = (pxi + (sx + 0.5) / ss) * scale;
          const y = (py + (sy + 0.5) / ss) * scale;
          // Vormultipliziert zusammensetzen (Quelle über Ziel).
          let cr = 0,
            cg = 0,
            cb = 0,
            ca = 0;
          list.forEach((sh, i) => {
            if (!inside(sh, x, y)) return;
            const al = sh.opacity ?? 1;
            const [sr, sg, sb] = cols[i];
            cr = sr * al + cr * (1 - al);
            cg = sg * al + cg * (1 - al);
            cb = sb * al + cb * (1 - al);
            ca = al + ca * (1 - al);
          });
          r += cr;
          g += cg;
          b += cb;
          a += ca;
        }
      }
      const n = ss * ss;
      const o = (py * size + pxi) * 4;
      const alpha = a / n;
      px[o] = alpha ? Math.round(r / n / alpha) : 0;
      px[o + 1] = alpha ? Math.round(g / n / alpha) : 0;
      px[o + 2] = alpha ? Math.round(b / n / alpha) : 0;
      px[o + 3] = Math.round(alpha * 255);
    }
  }
  return px;
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(px, size) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(px.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}
// ICO mit eingebetteten PNGs (ab Windows Vista und in allen aktuellen Browsern lesbar).
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size;
    e[1] = size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const any = shapes('any');
const maskable = shapes('maskable');
writeFileSync(join(out, 'icons/icon.svg'), toSvg(any));
writeFileSync(join(out, 'icons/icon-maskable.svg'), toSvg(maskable));
const pngOf = (list, size) => png(rasterize(list, size), size);
writeFileSync(join(out, 'icons/icon-192.png'), pngOf(any, 192));
writeFileSync(join(out, 'icons/icon-512.png'), pngOf(any, 512));
writeFileSync(join(out, 'icons/icon-maskable-512.png'), pngOf(maskable, 512));
// Apple setzt eigene Ecken und zeigt Transparenz schwarz: vollflächig, 180 px.
writeFileSync(join(out, 'icons/apple-touch-icon.png'), pngOf(maskable, 180));
writeFileSync(
  join(out, 'favicon.ico'),
  ico([16, 32, 48].map((size) => ({ size, data: pngOf(any, size) }))),
);
