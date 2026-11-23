// Which copy of the app is running, and its version.
// The same files are served at /next/ (the test copy) and at the root (the live copy), so the channel is
// read from the URL instead of being baked into the code. That lets promote copy files unchanged.

// Bump this with every change the owner will test on a phone, together with VERSION in next/sw.js.
// The About line shows it.
export const APP_VERSION = '1.0.0-m1.1';

export const CHANNELS = Object.freeze({ NEXT: 'next', LIVE: 'live' });

/** 'next' when the path has a /next/ folder in it, otherwise 'live'. */
export function channelFromPath(pathname) {
  return /(^|\/)next(\/|$)/.test(String(pathname || '')) ? CHANNELS.NEXT : CHANNELS.LIVE;
}

export function currentChannel() {
  return channelFromPath(globalThis.location ? globalThis.location.pathname : '');
}

/**
 * Where the recipe file is, seen from the page. Both copies read the one data/recipes.json at the repo
 * root: the live copy finds it beside itself, the test copy one folder up.
 */
export function recipeFileUrl(channel, pageUrl) {
  const relative = channel === CHANNELS.NEXT ? '../data/recipes.json' : 'data/recipes.json';
  const url = new URL(relative, pageUrl);
  url.hash = '';
  url.search = '';
  return url.href;
}

/** True when the app was opened from a Home Screen icon. */
export function isHomeScreenApp() {
  const nav = globalThis.navigator;
  if (nav && nav.standalone === true) return true;
  return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia('(display-mode: standalone)').matches;
}
