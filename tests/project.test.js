// Project rules from docs/BUILD_BRIEF.md section 3, checked mechanically where that is possible.

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../next/app/platform/channel.js';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const NEXT = join(ROOT, 'next');
const read = (path) => readFileSync(join(ROOT, path), 'utf8');
const short = (file) => relative(ROOT, file).split(sep).join('/');

function filesUnder(dir, extensions = null) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(path, extensions));
    else if (!extensions || extensions.some((ext) => entry.name.endsWith(ext))) found.push(path);
  }
  return found;
}

const nextCode = filesUnder(NEXT, ['.js', '.html', '.css', '.webmanifest']);
const nextScripts = filesUnder(join(NEXT, 'app'), ['.js']);
const engine = filesUnder(join(NEXT, 'app/engine'), ['.js']);
const withoutComments = (code) => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('rule 7: no runtime CDN, no framework: nothing is loaded from another site', () => {
  for (const file of nextCode) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, /<script[^>]+src=["']https?:/i, short(file));
    assert.doesNotMatch(text, /<link[^>]+href=["']https?:/i, short(file));
    assert.doesNotMatch(text, /\bfrom\s+['"]https?:/, short(file));
    assert.doesNotMatch(text, /\bimport\(\s*['"]https?:/, short(file));
    assert.doesNotMatch(text, /url\(\s*['"]?https?:/i, short(file));
    assert.doesNotMatch(text, /@import/, short(file));
  }
  assert.ok(!existsSync(join(ROOT, 'package.json')), 'no package.json: there is nothing to install and no build step');
});

test('rule 7: every import points at a file that exists, inside next/', () => {
  let count = 0;
  for (const file of nextScripts) {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      const target = match[1];
      assert.match(target, /^\.\.?\//, `${short(file)} imports "${target}": only relative imports are allowed`);
      const resolved = resolve(dirname(file), target);
      assert.ok(resolved.startsWith(NEXT + sep), `${short(file)} imports outside next/`);
      assert.ok(existsSync(resolved), `${short(file)} imports "${target}", which does not exist`);
      count++;
    }
  }
  assert.ok(count > 20);
});

test('every script parses, so a typo in a screen file cannot reach a phone', () => {
  // The other tests only load the engine and platform files. Screens need a browser, so they are checked
  // here for syntax at least: a broken screen file would leave the phone on the "Loading" page.
  const parses = (code, kind, label) => {
    const result = spawnSync(process.execPath, [`--input-type=${kind}`, '--check', '-'], { input: code, encoding: 'utf8' });
    assert.equal(result.status, 0, `${label} has a syntax error:\n${result.stderr}`);
  };
  let checked = 0;
  for (const file of [...nextScripts, ...filesUnder(join(ROOT, 'scripts'), ['.mjs'])]) {
    parses(readFileSync(file, 'utf8'), 'module', short(file));
    checked++;
  }
  parses(read('next/sw.js'), 'commonjs', 'next/sw.js');
  for (const file of filesUnder(NEXT, ['.html'])) {
    const html = readFileSync(file, 'utf8');
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/, `${short(file)}: no inline scripts`);
  }
  assert.ok(checked >= 18, `only ${checked} scripts were checked`);
});

test('rule 8: the engine is pure: no DOM, storage, network, or clock of its own', () => {
  assert.ok(engine.length >= 7);
  for (const file of engine) {
    const code = withoutComments(readFileSync(file, 'utf8'));
    assert.doesNotMatch(code, /\b(document|window|globalThis|localStorage|sessionStorage|indexedDB|caches|navigator|fetch|XMLHttpRequest|WebSocket)\b/, short(file));
    assert.doesNotMatch(code, /\bDate\.now\(|\bnew Date\(|\bperformance\.|\bsetTimeout\(|\bsetInterval\(|\bMath\.random\(/, short(file));
    for (const match of code.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)) {
      assert.match(match[1], /^\.\/[\w-]+\.js$/, `${short(file)} may only import from the engine folder`);
    }
  }
});

test('rule 8: quantities never pass through floating point', () => {
  for (const name of ['fraction.js', 'scale.js', 'shop.js']) {
    const code = withoutComments(read(`next/app/engine/${name}`));
    assert.doesNotMatch(code, /\bparseFloat\b|\.toFixed\(|\bMath\.(round|floor|ceil|trunc)\(|\bNumber\(/, `next/app/engine/${name}`);
    assert.doesNotMatch(code, /(?<![\w.])\d+\.\d+(?![\w.])/, `next/app/engine/${name} holds a decimal number`);
  }
  assert.match(read('next/app/engine/fraction.js'), /BigInt\(/);
});

test('storage: only platform/storage.js touches localStorage, so every key is namespaced', () => {
  for (const file of [...nextScripts, ...filesUnder(NEXT, ['.html'])]) {
    if (file.endsWith(join('platform', 'storage.js'))) continue;
    assert.doesNotMatch(readFileSync(file, 'utf8'), /\b(localStorage|sessionStorage|indexedDB)\b/, short(file));
  }
  assert.match(read('next/app/platform/storage.js'), /`rb:\$\{channel\}:v\$\{schema\}:\$\{name\}`/);
});

test('brief section 5: HTML is parsed in one place only, for the recipe file\'s own *_html fields', () => {
  for (const file of nextScripts) {
    const code = withoutComments(readFileSync(file, 'utf8'));
    assert.doesNotMatch(code, /insertAdjacentHTML|outerHTML|document\.write|DOMParser|createContextualFragment|\beval\(|new Function\(/, short(file));
    if (!file.endsWith(join('ui', 'dom.js'))) assert.doesNotMatch(code, /innerHTML/, `${short(file)}: use setTrustedHtml or textContent`);
  }
  // What each call hands over: the last argument on the line, as in setTrustedHtml(node, recipe.steps_html).
  const uses = [];
  for (const file of nextScripts) {
    for (const line of withoutComments(readFileSync(file, 'utf8')).split('\n')) {
      if (!line.includes('setTrustedHtml(')) continue;
      const match = line.match(/setTrustedHtml\(.*,\s*([\w.]+)\)/);
      assert.ok(match, `${short(file)}: cannot read this call: ${line.trim()}`);
      uses.push(match[1]);
    }
  }
  assert.ok(uses.length >= 3);
  for (const argument of uses) {
    if (argument === 'html') continue; // the definition itself
    assert.match(argument, /^(recipe\.steps_html|recipe\.notes_html|section\.html)$/, `setTrustedHtml is given "${argument}"`);
  }
});

test('rule 12: every page carries noindex, nofollow', () => {
  const pages = [join(ROOT, 'index.html'), ...filesUnder(NEXT, ['.html'])];
  assert.ok(pages.length >= 2);
  for (const file of pages) {
    assert.match(readFileSync(file, 'utf8'), /<meta name="robots" content="noindex, nofollow">/, short(file));
  }
});

test('rule 12: no analytics, no license file', () => {
  for (const file of nextCode) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /gtag|google-analytics|googletagmanager|plausible|segment\.com|sendBeacon/i, short(file));
  }
  for (const entry of readdirSync(ROOT)) assert.doesNotMatch(entry, /^(LICEN[CS]E|COPYING)/i, entry);
});

test('no hidden-video wake lock hack', () => {
  for (const file of nextCode) assert.doesNotMatch(readFileSync(file, 'utf8'), /<video|createElement\(['"]video/i, short(file));
});

test('the page, the manifest, and the icons are wired together with relative paths', () => {
  const html = read('next/index.html');
  for (const match of html.matchAll(/\b(?:href|src)="([^"#]+)"/g)) {
    const target = match[1];
    assert.doesNotMatch(target, /^(\/|https?:)/, `index.html: "${target}" must be relative so the page works at / and at /next/`);
    assert.ok(existsSync(join(NEXT, target)), `index.html points at "${target}", which does not exist`);
  }
  assert.match(html, /<script type="module" src="app\/main\.js"><\/script>/);
  const manifest = JSON.parse(read('next/manifest.webmanifest'));
  assert.equal(manifest.name, 'Recipes');
  assert.equal(manifest.short_name, 'Recipes');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.scope, './');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) assert.ok(existsSync(join(NEXT, icon.src)), `manifest icon ${icon.src}`);
  assert.match(html, /<link rel="apple-touch-icon" href="assets\/icon-180\.png">/);
  assert.match(html, /<meta name="apple-mobile-web-app-title" content="Recipes">/);
});

test('icons are real PNG files of the stated size', () => {
  for (const size of [180, 192, 512]) {
    const png = readFileSync(join(NEXT, `assets/icon-${size}.png`));
    assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
  }
});

test('offline: the service worker has the app version and lists every file of the app', () => {
  const sw = read('next/sw.js');
  const version = sw.match(/^const VERSION = '([^']+)';$/m);
  assert.ok(version, 'sw.js declares VERSION');
  assert.equal(version[1], APP_VERSION, 'VERSION in next/sw.js must equal APP_VERSION in channel.js');
  const listed = [...sw.match(/const SHELL = \[([\s\S]*?)\];/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const onDisk = filesUnder(NEXT)
    .map((file) => relative(NEXT, file).split(sep).join('/'))
    .filter((path) => path !== 'sw.js' && !path.endsWith('.DS_Store'));
  assert.deepEqual([...listed].sort(), ['./', ...onDisk].sort(), 'SHELL in next/sw.js must list every file under next/ except sw.js');
  assert.equal(new Set(listed).size, listed.length);
});

test('promote copies exactly the live app files, and nothing else writes to the root', () => {
  const script = read('scripts/promote.sh');
  for (const part of ['next/index.html index.html', 'next/manifest.webmanifest manifest.webmanifest', 'next/sw.js sw.js', 'for dir in app assets']) {
    assert.ok(script.includes(part), `promote.sh: ${part}`);
  }
  const topLevel = readdirSync(NEXT).filter((name) => name !== '.DS_Store').sort();
  assert.deepEqual(topLevel, ['app', 'assets', 'index.html', 'manifest.webmanifest', 'sw.js'], 'a new top-level entry under next/ must be added to promote.sh');
  assert.doesNotMatch(script, /git (commit|push)/, 'promote.sh must not commit or push');
  assert.doesNotMatch(script, /\bdata\b(?!\/, docs)/, 'promote.sh must not touch data/');
});

test('rule 5: no photos or PDFs in the repo, and the only pictures are the icons', () => {
  for (const file of filesUnder(ROOT)) {
    const ext = extname(file).toLowerCase();
    assert.ok(!['.jpg', '.jpeg', '.heic', '.gif', '.webp', '.tiff', '.bmp', '.pdf', '.env'].includes(ext), short(file));
    if (ext === '.png') assert.match(short(file), /^(next\/)?assets\/icon-\d+\.png$/, short(file));
  }
});

test('rule 5: no email addresses in anything written for this project', () => {
  const files = filesUnder(ROOT, ['.js', '.mjs', '.html', '.css', '.webmanifest', '.md', '.sh', '.json']).filter(
    (file) => !file.endsWith(join('docs', 'BUILD_BRIEF.md')) && !file.startsWith(join(ROOT, 'data') + sep),
  );
  for (const file of files) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), /[\w.+-]+@[\w-]+\.[a-z]{2,}/i, short(file));
  }
});

test('writing style: no en dashes, em dashes, or emojis in anything written for this project', () => {
  const files = [
    ...filesUnder(NEXT, ['.js', '.html', '.css', '.webmanifest', '.md']),
    ...filesUnder(join(ROOT, 'tests'), ['.js']),
    ...filesUnder(join(ROOT, 'scripts'), ['.mjs', '.sh']),
    join(ROOT, 'CLAUDE.md'),
    join(ROOT, 'index.html'),
    ...filesUnder(join(ROOT, 'docs'), ['.md']).filter((file) => !file.endsWith('BUILD_BRIEF.md')),
  ];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    assert.doesNotMatch(text, new RegExp('[' + String.fromCharCode(0x2013, 0x2014) + ']'), `${short(file)} has an en or em dash`);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}/u, `${short(file)} has an emoji`);
  }
});

test('the brief in the repo is the owner\'s file, untouched since the kickoff copy', () => {
  // Rule 11 and kickoff step 1: never summarise or reword it. Answers go in docs/DECISIONS.md.
  const result = spawnSync('git', ['log', '--format=%H', '--', 'docs/BUILD_BRIEF.md'], { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) return; // not a git checkout (for example a plain copy of the folder)
  assert.equal(result.stdout.trim().split('\n').length, 1, 'docs/BUILD_BRIEF.md has been committed more than once');
  const dirty = spawnSync('git', ['status', '--porcelain', '--', 'docs/BUILD_BRIEF.md'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(dirty.stdout.trim(), '', 'docs/BUILD_BRIEF.md has uncommitted changes');
});

test('CLAUDE.md stays within 60 lines', () => {
  assert.ok(read('CLAUDE.md').trimEnd().split('\n').length <= 60);
});

test('.gitignore covers secrets, photos, and PDFs', () => {
  const ignore = read('.gitignore').split('\n');
  for (const line of ['.env', '.env.*', '*.pem', '*.key', '*.heic', '*.jpg', '*.pdf']) assert.ok(ignore.includes(line), line);
});
