// The recipe file on this phone: a saved copy that opens at once, and a download that refreshes it
// (brief section 4, "stale while revalidate"). Deciding which copy to show is engine/data.js; this
// file only reads, downloads, and saves.
//
// The saved copy is kept by the page, not by the service worker, so that a file with a newer schema can
// be looked at and refused before it replaces the copy that works (the schema guard).

/** The name of the saved copy's cache. The service worker only clears caches named "...-shell-...". */
export const dataCacheName = (channel) => `rb-${channel}-data`;

/**
 * @param {{ url: string, channel: string, cacheStorage?: CacheStorage, fetchFn?: typeof fetch }} options
 */
export function createRecipeFile({ url, channel, cacheStorage = globalThis.caches, fetchFn = globalThis.fetch }) {
  const name = dataCacheName(channel);

  /** The copy saved on this phone, or null when there is none or it cannot be read. */
  async function readSaved() {
    try {
      if (!cacheStorage) return null;
      const cache = await cacheStorage.open(name);
      const response = await cache.match(url);
      return response ? await response.json() : null;
    } catch {
      return null;
    }
  }

  /** A fresh download, or null when there is no connection or the answer is not a JSON file. */
  async function download() {
    try {
      const response = await fetchFn(url, { cache: 'no-store' });
      if (!response.ok) return null;
      return JSON.parse(await response.text());
    } catch {
      return null;
    }
  }

  /** Keep a download for next time. True when it was saved. */
  async function save(data) {
    try {
      if (!cacheStorage) return false;
      const cache = await cacheStorage.open(name);
      await cache.put(url, new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json; charset=utf-8' } }));
      return true;
    } catch {
      return false;
    }
  }

  return { url, readSaved, download, save, canSave: Boolean(cacheStorage) };
}
