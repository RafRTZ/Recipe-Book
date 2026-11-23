// Draws the Home Screen icon and writes it as PNG files. No dependencies.
// Usage: node scripts/make-icons.mjs
// The drawing is original: a bowl with three wisps of steam. No third-party logo.
// Colours come from the light tokens in next/app/ui/styles.css so the icon always matches the app.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const root = new URL('..', import.meta.url);
const css = readFileSync(new URL('next/app/ui/styles.css', root), 'utf8');

function token(name) {
  const match = css.match(new RegExp(`--${name}:\\s*#([0-9a-fA-F]{6})`));
  if (!match) throw new Error(`Colour token --${name} not found in styles.css`);
  return [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
}

const GROUND = token('accent');
const CREAM = token('bg');

// ---- the drawing, in a 0..1 square. Everything stays inside the middle 80%, so a round mask fits. ----

const BOWL = { cx: 0.5, cy: 0.5, r: 0.3 }; // the lower half of a circle
const RIM = { x0: 0.16, x1: 0.84, y0: 0.455, y1: 0.515, r: 0.03 };
const FOOT = { x0: 0.38, x1: 0.62, y0: 0.785, y1: 0.835, r: 0.02 };
const STEAM = { xs: [0.36, 0.5, 0.64], top: 0.17, bottom: 0.39, sway: 0.022, thickness: 0.036 };

function inRoundedBox(x, y, box) {
  if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) return false;
  const cx = Math.min(Math.max(x, box.x0 + box.r), box.x1 - box.r);
  const cy = Math.min(Math.max(y, box.y0 + box.r), box.y1 - box.r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= box.r ** 2;
}

function inBowl(x, y) {
  return y >= BOWL.cy && (x - BOWL.cx) ** 2 + (y - BOWL.cy) ** 2 <= BOWL.r ** 2;
}

function inSteam(x, y) {
  const half = STEAM.thickness / 2;
  // Each wisp is a wavy line with round ends: the distance to the nearest point of its centre line.
  const yOn = Math.min(Math.max(y, STEAM.top), STEAM.bottom);
  const turn = ((yOn - STEAM.top) / (STEAM.bottom - STEAM.top)) * 2 * Math.PI;
  return STEAM.xs.some((centre) => {
    const xOn = centre + STEAM.sway * Math.sin(turn);
    return (x - xOn) ** 2 + (y - yOn) ** 2 <= half ** 2;
  });
}

function colourAt(x, y) {
  return inBowl(x, y) || inRoundedBox(x, y, RIM) || inRoundedBox(x, y, FOOT) || inSteam(x, y) ? CREAM : GROUND;
}

// ---- rasterise with 4x4 supersampling ----

function render(size) {
  const SS = 4;
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = colourAt((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const i = (py * size + px) * 4;
      pixels[i] = Math.round(r / (SS * SS));
      pixels[i + 1] = Math.round(g / (SS * SS));
      pixels[i + 2] = Math.round(b / (SS * SS));
      pixels[i + 3] = 255; // fully opaque: iOS turns transparent icon pixels black
    }
  }
  return pixels;
}

// ---- PNG encoding ----

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size, pixels) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA
  const rows = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rows[y * (size * 4 + 1)] = 0; // no filter
    pixels.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync(new URL('next/assets/', root), { recursive: true });
for (const size of [180, 192, 512]) {
  const file = new URL(`next/assets/icon-${size}.png`, root);
  writeFileSync(file, png(size, render(size)));
  console.log(`wrote next/assets/icon-${size}.png`);
}
