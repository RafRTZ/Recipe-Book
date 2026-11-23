// Local static server for development. No dependencies.
// Usage: node scripts/serve.mjs [port]   then open http://localhost:8081/next/
// Serves the repo root the way GitHub Pages does, with caching switched off.

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.argv[2] || process.env.PORT || 8081);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
};

async function resolveFile(urlPath) {
  const clean = normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^([/\\])+/, '');
  let file = join(root, clean);
  if (file !== root && !file.startsWith(root + sep)) return null;
  if (clean.split(/[/\\]/).some((part) => part.startsWith('.git'))) return null;
  let info = await stat(file).catch(() => null);
  if (info && info.isDirectory()) {
    if (!urlPath.split('?')[0].endsWith('/')) return { redirect: urlPath.split('?')[0] + '/' };
    file = join(file, 'index.html');
    info = await stat(file).catch(() => null);
  }
  return info && info.isFile() ? { file } : null;
}

const server = createServer(async (req, res) => {
  try {
    const found = await resolveFile(req.url || '/');
    if (!found) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    if (found.redirect) {
      res.writeHead(301, { location: found.redirect });
      res.end();
      return;
    }
    const body = await readFile(found.file);
    res.writeHead(200, {
      'content-type': TYPES[extname(found.file).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch (err) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Server error');
    console.error(err);
  }
});

server.listen(port, () => {
  console.log(`Serving ${root}`);
  console.log(`  test copy: http://localhost:${port}/next/`);
  console.log(`  live copy: http://localhost:${port}/`);
});
