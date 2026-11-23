// Service worker: keeps the app's own files on the phone so it opens with no signal (brief section 4).
// The same file is served at the root (live copy) and under next/ (test copy). Each copy registers its
// own, scoped to its own folder, with its own cache, so one copy can never serve the other's files.
//
// What it does: the files in SHELL are saved when a version is installed and are then always served
// from the phone, never the network. Everything else goes to the network untouched. The recipe file is
// NOT handled here: the page keeps its own saved copy of it (app/platform/recipefile.js).
//
// VERSION must equal APP_VERSION in app/platform/channel.js, and SHELL must list every file under this
// folder except this one. tests/project.test.js checks both. Changing VERSION is what makes a phone
// fetch the new files.

const VERSION = '1.0.0-m1.1';

const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'app/main.js',
  'app/engine/constants.js',
  'app/engine/data.js',
  'app/engine/fraction.js',
  'app/engine/list.js',
  'app/engine/scale.js',
  'app/engine/search.js',
  'app/engine/shop.js',
  'app/platform/channel.js',
  'app/platform/offline.js',
  'app/platform/recipefile.js',
  'app/platform/share.js',
  'app/platform/storage.js',
  'app/platform/wakelock.js',
  'app/ui/book.js',
  'app/ui/dom.js',
  'app/ui/recipe.js',
  'app/ui/shopping.js',
  'app/ui/styles.css',
  'assets/icon-180.png',
  'assets/icon-192.png',
  'assets/icon-512.png',
];

const scope = new URL('./', self.location.href);
const CHANNEL = /(^|\/)next(\/|$)/.test(scope.pathname) ? 'next' : 'live';
const PREFIX = `rb-${CHANNEL}-shell-`;
const CACHE = PREFIX + VERSION;
const SHELL_PATHS = new Set(SHELL);

/**
 * 'shell' when the request is for one of this copy's own files, otherwise 'network'.
 * The live copy's folder contains next/ and data/, and it must leave both alone.
 */
function route(href) {
  const url = new URL(href);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return 'network';
  const rest = url.pathname.slice(scope.pathname.length);
  return SHELL_PATHS.has(rest === '' ? './' : rest) ? 'shell' : 'network';
}

const cacheKey = (path) => new URL(path, scope).href;

async function install() {
  const cache = await caches.open(CACHE);
  // All or nothing: if one file fails, the install fails and the old version keeps serving.
  await Promise.all(
    SHELL.map(async (path) => {
      const response = await fetch(new Request(cacheKey(path), { cache: 'reload' }));
      if (!response.ok) throw new Error(`${path}: ${response.status}`);
      await cache.put(cacheKey(path), response);
    }),
  );
}

async function activate() {
  // Clear this copy's older versions only. The other copy's caches and the saved recipe file stay.
  for (const name of await caches.keys()) {
    if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name);
  }
  await self.clients.claim();
}

async function fromShell(request) {
  const url = new URL(request.url);
  const rest = url.pathname.slice(scope.pathname.length);
  const cache = await caches.open(CACHE);
  const saved = await cache.match(cacheKey(rest === '' ? './' : rest));
  return saved || fetch(request);
}

self.addEventListener('install', (event) => event.waitUntil(install()));
self.addEventListener('activate', (event) => event.waitUntil(activate()));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || route(request.url) !== 'shell') return;
  event.respondWith(fromShell(request));
});

// The page sends this when the reader taps "Refresh" on the "App updated" line.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'activate') self.skipWaiting();
});
