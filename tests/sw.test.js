// The service worker (brief section 4): each copy keeps its own files and leaves the other copy, the
// recipe file, and everything else alone. The real next/sw.js is run here against stand-ins for the
// browser's caches and network.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { dataCacheName } from '../next/app/platform/recipefile.js';

const source = readFileSync(new URL('../next/sw.js', import.meta.url), 'utf8');
const LIVE = 'https://example.test/Recipe-Book/';
const NEXT = 'https://example.test/Recipe-Book/next/';

/** Run sw.js as if it were served from `folder`. `fails` lists URLs the pretend network refuses. */
function load(folder, { fails = [] } = {}) {
  const listeners = {};
  const stores = new Map();
  const fetched = [];
  const state = { claimed: false, skipped: false };
  const caches = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (url, response) => void store.set(url, response),
        match: async (url) => store.get(url),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name) => stores.delete(name),
  };
  const context = vm.createContext({
    self: {
      location: { href: `${folder}sw.js` },
      addEventListener: (type, handler) => void (listeners[type] = handler),
      clients: { claim: async () => void (state.claimed = true) },
      skipWaiting: () => void (state.skipped = true),
    },
    caches,
    URL,
    Request: class {
      constructor(url, init = {}) {
        this.url = url;
        this.cache = init.cache;
        this.method = 'GET';
      }
    },
    fetch: async (request) => {
      const url = typeof request === 'string' ? request : request.url;
      fetched.push({ url, cache: request.cache });
      if (fails.includes(url)) return { ok: false, status: 404, from: 'network', url };
      return { ok: true, status: 200, from: 'network', url };
    },
  });
  vm.runInContext(source, context);
  const run = async (type, event = {}) => {
    let waited = null;
    listeners[type]({ ...event, waitUntil: (promise) => void (waited = promise) });
    await waited;
  };
  const request = (url, method = 'GET') => {
    let answer = null;
    listeners.fetch({ request: { url, method }, respondWith: (promise) => void (answer = promise) });
    return answer;
  };
  return { context, listeners, stores, fetched, state, run, request, shell: vm.runInContext('SHELL', context), cache: vm.runInContext('CACHE', context) };
}

test('each copy names its cache after its own channel and version', () => {
  assert.match(load(NEXT).cache, /^rb-next-shell-\d/);
  assert.match(load(LIVE).cache, /^rb-live-shell-\d/);
});

test('the test copy serves only its own files', () => {
  const { context } = load(NEXT);
  assert.equal(context.route(NEXT), 'shell');
  assert.equal(context.route(`${NEXT}index.html`), 'shell');
  assert.equal(context.route(`${NEXT}app/main.js`), 'shell');
  assert.equal(context.route(`${NEXT}app/ui/styles.css?x=1`), 'shell');
  assert.equal(context.route(`${NEXT}assets/icon-180.png`), 'shell');
  assert.equal(context.route(`${LIVE}data/recipes.json`), 'network', 'the recipe file belongs to the page');
  assert.equal(context.route(LIVE), 'network', 'the live copy');
  assert.equal(context.route(`${LIVE}app/main.js`), 'network', 'the live copy');
  assert.equal(context.route(`${NEXT}sw.js`), 'network');
  assert.equal(context.route(`${NEXT}no-such-file.js`), 'network');
  assert.equal(context.route('https://elsewhere.test/Recipe-Book/next/app/main.js'), 'network', 'another site');
});

test('the live copy serves only its own files, and never the test copy\'s, though next/ is inside its folder', () => {
  const { context } = load(LIVE);
  assert.equal(context.route(LIVE), 'shell');
  assert.equal(context.route(`${LIVE}index.html`), 'shell');
  assert.equal(context.route(`${LIVE}app/main.js`), 'shell');
  assert.equal(context.route(NEXT), 'network', 'the test copy');
  assert.equal(context.route(`${NEXT}index.html`), 'network', 'the test copy');
  assert.equal(context.route(`${NEXT}app/main.js`), 'network', 'the test copy');
  assert.equal(context.route(`${LIVE}data/recipes.json`), 'network', 'the recipe file belongs to the page');
  assert.equal(context.route(`${LIVE}data/parity.json`), 'network');
  assert.equal(context.route(`${LIVE}docs/TESTING.md`), 'network');
  assert.equal(context.route(`${LIVE}sw.js`), 'network');
});

test('install saves every file of the app, fetched fresh', async () => {
  const worker = load(NEXT);
  await worker.run('install');
  const saved = worker.stores.get(worker.cache);
  assert.equal(saved.size, worker.shell.length);
  assert.ok(saved.has(NEXT), 'the folder itself, which is how the app is opened');
  assert.ok(saved.has(`${NEXT}app/main.js`));
  for (const entry of worker.fetched) {
    assert.ok(entry.url.startsWith(NEXT), entry.url);
    assert.equal(entry.cache, 'reload', 'install must not take a stale file from the browser\'s own cache');
  }
});

test('install is all or nothing: one missing file fails it, so the old version keeps serving', async () => {
  const worker = load(NEXT, { fails: [`${NEXT}app/ui/styles.css`] });
  await assert.rejects(worker.run('install'), /styles\.css: 404/);
});

test('activate clears this copy\'s older versions only', async () => {
  const worker = load(NEXT);
  for (const name of ['rb-next-shell-0.9', 'rb-live-shell-0.9', dataCacheName('next'), dataCacheName('live'), 'someone-elses-cache']) {
    await worker.context.caches.open(name);
  }
  await worker.run('install');
  await worker.run('activate');
  assert.deepEqual([...worker.stores.keys()].sort(), ['rb-live-shell-0.9', dataCacheName('live'), dataCacheName('next'), worker.cache, 'someone-elses-cache'].sort());
  assert.ok(worker.state.claimed);
});

test('the saved recipe file is never in a cache the service worker clears', () => {
  for (const channel of ['next', 'live']) assert.doesNotMatch(dataCacheName(channel), /-shell-/);
});

test('a request for one of the app\'s files is answered from the phone, with no network', async () => {
  const worker = load(NEXT);
  await worker.run('install');
  worker.fetched.length = 0;
  const page = await worker.request(NEXT);
  assert.equal(page.url, NEXT);
  const script = await worker.request(`${NEXT}app/main.js`);
  assert.equal(script.url, `${NEXT}app/main.js`);
  assert.equal(worker.fetched.length, 0);
});

test('everything else is left to the network: the recipe file, the other copy, and anything that is not a GET', async () => {
  const worker = load(LIVE);
  await worker.run('install');
  assert.equal(worker.request(`${LIVE}data/recipes.json`), null);
  assert.equal(worker.request(NEXT), null);
  assert.equal(worker.request(`${NEXT}app/main.js`), null);
  assert.equal(worker.request(`${LIVE}app/main.js`, 'POST'), null);
  assert.notEqual(worker.request(`${LIVE}app/main.js`), null);
});

test('a waiting version takes over only when the page asks', async () => {
  const worker = load(NEXT);
  worker.listeners.message({ data: { type: 'something-else' } });
  worker.listeners.message({ data: null });
  assert.equal(worker.state.skipped, false);
  worker.listeners.message({ data: { type: 'activate' } });
  assert.equal(worker.state.skipped, true);
});
