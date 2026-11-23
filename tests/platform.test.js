// The parts of the platform layer that can run without a phone: the channel, the storage keys, and the
// saved copy of the recipe file (brief section 4).

import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_VERSION, channelFromPath, recipeFileUrl } from '../next/app/platform/channel.js';
import { createRecipeFile, dataCacheName } from '../next/app/platform/recipefile.js';
import { createStore, memoryBackend, storageKey } from '../next/app/platform/storage.js';

test('the channel comes from the URL', () => {
  assert.equal(channelFromPath('/Recipe-Book/next/'), 'next');
  assert.equal(channelFromPath('/Recipe-Book/next/index.html'), 'next');
  assert.equal(channelFromPath('/next/'), 'next');
  assert.equal(channelFromPath('/Recipe-Book/'), 'live');
  assert.equal(channelFromPath('/Recipe-Book/index.html'), 'live');
  assert.equal(channelFromPath('/nextdoor/'), 'live');
  assert.equal(channelFromPath(''), 'live');
});

test('both copies read the one recipe file at the repo root', () => {
  const file = 'https://example.test/Recipe-Book/data/recipes.json';
  assert.equal(recipeFileUrl('live', 'https://example.test/Recipe-Book/'), file);
  assert.equal(recipeFileUrl('live', 'https://example.test/Recipe-Book/index.html#/list'), file);
  assert.equal(recipeFileUrl('next', 'https://example.test/Recipe-Book/next/'), file);
  assert.equal(recipeFileUrl('next', 'https://example.test/Recipe-Book/next/#/recipe/granola'), file);
  assert.equal(recipeFileUrl('next', 'https://example.test/Recipe-Book/next/index.html?x=1'), file);
});

test('the app version looks like a version', () => {
  assert.match(APP_VERSION, /^\d+\.\d+\.\d+-m\d+\.\d+$/);
});

test('storage keys are namespaced by channel and version', () => {
  assert.equal(storageKey('next', 'list'), 'rb:next:v1:list');
  assert.equal(storageKey('live', 'list'), 'rb:live:v1:list');
  assert.throws(() => createStore('other'));
});

test('the test copy and the live copy never see each other\'s list', () => {
  const backend = memoryBackend();
  const next = createStore('next', backend);
  const live = createStore('live', backend);
  next.set('list', { items: [1] });
  assert.equal(live.get('list'), null);
  assert.deepEqual(next.get('list'), { items: [1] });
  live.set('list', { items: [2] });
  assert.deepEqual(next.get('list'), { items: [1] });
  next.remove('list');
  assert.equal(next.get('list', 'gone'), 'gone');
  assert.deepEqual(live.get('list'), { items: [2] });
});

test('storage never throws: a broken backend reads as the fallback and writes as false', () => {
  const broken = {
    getItem() {
      throw new Error('blocked');
    },
    setItem() {
      throw new Error('full');
    },
    removeItem() {
      throw new Error('blocked');
    },
  };
  const store = createStore('next', broken);
  assert.equal(store.get('list', 'fallback'), 'fallback');
  assert.equal(store.set('list', {}), false);
  assert.equal(store.remove('list'), false);
  const garbled = createStore('next', { getItem: () => '{not json', setItem() {}, removeItem() {} });
  assert.equal(garbled.get('list', 'fallback'), 'fallback');
});

// ---- the saved copy of the recipe file ----

function fakeCaches() {
  const stores = new Map();
  return {
    stores,
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        put: async (url, response) => void store.set(url, await response.text()),
        match: async (url) => (store.has(url) ? new Response(store.get(url)) : undefined),
      };
    },
  };
}

const URL_ = 'https://example.test/Recipe-Book/data/recipes.json';
const answer = (body, ok = true) => async () => ({ ok, text: async () => body });

test('nothing saved yet reads as null', async () => {
  const file = createRecipeFile({ url: URL_, channel: 'next', cacheStorage: fakeCaches(), fetchFn: answer('{}') });
  assert.equal(await file.readSaved(), null);
});

test('a saved download is read back, from the cache named for its channel', async () => {
  const cacheStorage = fakeCaches();
  const file = createRecipeFile({ url: URL_, channel: 'next', cacheStorage, fetchFn: answer('{"schema":1,"version":"abc"}') });
  const data = await file.download();
  assert.deepEqual(data, { schema: 1, version: 'abc' });
  assert.equal(await file.save(data), true);
  assert.deepEqual(await file.readSaved(), data);
  assert.deepEqual([...cacheStorage.stores.keys()], [dataCacheName('next')]);
  const live = createRecipeFile({ url: URL_, channel: 'live', cacheStorage, fetchFn: answer('{}') });
  assert.equal(await live.readSaved(), null, 'the live copy has its own saved file');
});

test('the download asks the network, not the browser\'s own cache', async () => {
  const calls = [];
  const file = createRecipeFile({
    url: URL_,
    channel: 'next',
    cacheStorage: fakeCaches(),
    fetchFn: async (url, options) => {
      calls.push([url, options]);
      return { ok: true, text: async () => '{}' };
    },
  });
  await file.download();
  assert.deepEqual(calls, [[URL_, { cache: 'no-store' }]]);
});

test('no connection, an error page, or a file that is not JSON all read as "no download"', async () => {
  const make = (fetchFn) => createRecipeFile({ url: URL_, channel: 'next', cacheStorage: fakeCaches(), fetchFn });
  assert.equal(
    await make(async () => {
      throw new TypeError('Load failed');
    }).download(),
    null,
  );
  assert.equal(await make(answer('Not found', false)).download(), null);
  assert.equal(await make(answer('<html>Sign in to the wifi</html>')).download(), null);
});

test('with no cache storage the app still works with a connection', async () => {
  const file = createRecipeFile({ url: URL_, channel: 'next', cacheStorage: undefined, fetchFn: answer('{"schema":1}') });
  assert.equal(file.canSave, false);
  assert.equal(await file.readSaved(), null);
  assert.equal(await file.save({ schema: 1 }), false);
  assert.deepEqual(await file.download(), { schema: 1 });
});

test('a damaged saved copy reads as null instead of stopping the app', async () => {
  const cacheStorage = fakeCaches();
  (await cacheStorage.open(dataCacheName('next'))).put(URL_, new Response('{broken'));
  const file = createRecipeFile({ url: URL_, channel: 'next', cacheStorage, fetchFn: answer('{}') });
  assert.equal(await file.readSaved(), null);
});
