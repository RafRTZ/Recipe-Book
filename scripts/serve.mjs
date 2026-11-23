// Local static server for development. No dependencies.
// Usage: node scripts/serve.mjs [port]   then open http://localhost:8081/next/
// Serves the repo root the way GitHub Pages does, with caching switched off.
//
// For trying the schema guard and a dead connection by hand, the recipe file can be swapped in memory.
// Open one of these, then reload the app. Nothing on disk is changed, and it resets when the server stops.
//   /__test?recipes=newer    data/recipes.json with its schema raised by one
//   /__test?recipes=changed  the same recipes under a different version
//   /__test?recipes=fewer    a different version with the first recipe taken out
//   /__test?recipes=down     no answer for it, as with no connection
//   /__test?recipes=normal   back to the real file

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

const RECIPE_MODES = ['normal', 'newer', 'changed', 'fewer', 'down'];
let recipeMode = 'normal';

/** The recipe file as the chosen test mode would serve it, or null to serve the real file. */
async function swappedRecipes() {
  if (recipeMode === 'normal') return null;
  const data = JSON.parse(await readFile(join(root, 'data', 'recipes.json'), 'utf8'));
  if (recipeMode === 'newer') data.schema += 1;
  if (recipeMode === 'changed' || recipeMode === 'fewer') data.version = `test-${recipeMode}`;
  if (recipeMode === 'fewer') {
    data.recipes = data.recipes.slice(1);
    data.count = data.recipes.length;
  }
  return JSON.stringify(data);
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    if (url.pathname === '/__test') {
      const wanted = url.searchParams.get('recipes');
      if (RECIPE_MODES.includes(wanted)) recipeMode = wanted;
      res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
      res.end(`recipes: ${recipeMode}`);
      return;
    }
    if (url.pathname === '/data/recipes.json' && recipeMode !== 'normal') {
      if (recipeMode === 'down') {
        req.socket.destroy();
        return;
      }
      res.writeHead(200, { 'content-type': TYPES['.json'], 'cache-control': 'no-store' });
      res.end(await swappedRecipes());
      return;
    }
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
