// On-phone storage. Keys are namespaced by channel and schema version (rb:next:v1:..., rb:live:v1:...),
// so the test copy can never touch the live copy's list. Both copies share one origin, hence the prefix.

export const STORAGE_SCHEMA = 1;

export function storageKey(channel, name, schema = STORAGE_SCHEMA) {
  return `rb:${channel}:v${schema}:${name}`;
}

/** A stand-in used when the browser refuses localStorage (private mode, blocked site data). */
export function memoryBackend() {
  const items = new Map();
  return {
    getItem: (key) => (items.has(key) ? items.get(key) : null),
    setItem: (key, value) => {
      items.set(key, String(value));
    },
    removeItem: (key) => {
      items.delete(key);
    },
  };
}

function localBackend() {
  try {
    const storage = globalThis.localStorage;
    const probe = 'rb:probe';
    storage.setItem(probe, '1');
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}

/**
 * A small JSON store for one channel. Reads and writes never throw: a read that fails returns the
 * fallback, and a write that fails returns false.
 */
export function createStore(channel, backend = null) {
  if (channel !== 'next' && channel !== 'live') throw new Error(`Unknown channel: ${channel}`);
  const real = backend || localBackend();
  const used = real || memoryBackend();
  return {
    channel,
    persistent: Boolean(real),
    key: (name) => storageKey(channel, name),
    get(name, fallback = null) {
      try {
        const raw = used.getItem(storageKey(channel, name));
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(name, value) {
      try {
        used.setItem(storageKey(channel, name), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
    remove(name) {
      try {
        used.removeItem(storageKey(channel, name));
        return true;
      } catch {
        return false;
      }
    },
  };
}
